import { format } from 'date-fns';
import { LIMITS, type Entry, type Item, type ValueField } from '../db/types';
import { formatDecimal } from './number';

export const BACKUP_FORMAT = 'klicker-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  appVersion: string;
  items: Item[];
  entries: Entry[];
}

export function createBackup(
  items: Item[],
  entries: Entry[],
  appVersion: string,
  now = Date.now(),
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    appVersion,
    items,
    entries,
  };
}

export function backupFileName(ext: 'json' | 'csv', now = Date.now()): string {
  return `klicker-${ext === 'json' ? 'backup' : 'eintraege'}-${format(now, 'yyyy-MM-dd-HHmm')}.${ext}`;
}

// ---------- Prüfung beim Import (Datei kommt von außen → nichts ungeprüft übernehmen) ----------

export type ValidationResult = { ok: true; backup: Backup } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = 10_000): v is string => typeof v === 'string' && v.length <= max;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optStr = (v: unknown, max: number) => v === undefined || isStr(v, max);

function validField(f: unknown): f is ValueField {
  return (
    isObj(f) &&
    isStr(f.key, 64) &&
    isStr(f.name, LIMITS.fieldName) &&
    optStr(f.unit, LIMITS.unit) &&
    (f.min === undefined || isNum(f.min)) &&
    (f.max === undefined || isNum(f.max)) &&
    Number.isInteger(f.decimals) &&
    (f.decimals as number) >= 0 &&
    (f.decimals as number) <= LIMITS.maxDecimals
  );
}

function validItem(i: unknown): i is Item {
  return (
    isObj(i) &&
    isStr(i.id, 64) &&
    isStr(i.name, LIMITS.name) &&
    (i.name as string).trim() !== '' &&
    optStr(i.label, LIMITS.label) &&
    optStr(i.memo, LIMITS.memo) &&
    isStr(i.icon, 32) &&
    (i.type === 'counter' || i.type === 'value') &&
    Array.isArray(i.fields) &&
    i.fields.length <= LIMITS.maxFields &&
    i.fields.every(validField) &&
    typeof i.dailyReset === 'boolean' &&
    typeof i.favorite === 'boolean' &&
    typeof i.archived === 'boolean' &&
    isNum(i.sortOrder) &&
    isNum(i.createdAt) &&
    isNum(i.updatedAt)
  );
}

function validEntry(e: unknown): e is Entry {
  return (
    isObj(e) &&
    isStr(e.id, 64) &&
    isStr(e.itemId, 64) &&
    isNum(e.timestamp) &&
    isNum(e.createdAt) &&
    optStr(e.note, LIMITS.note) &&
    (e.values === undefined || (isObj(e.values) && Object.values(e.values).every(isNum)))
  );
}

/** Nur bekannte Felder übernehmen – unbekannte Zusatzdaten aus der Datei werden verworfen. */
function pickItem(i: Item): Item {
  const item: Item = {
    id: i.id,
    name: i.name,
    icon: i.icon,
    type: i.type,
    fields: i.fields.map((f) => {
      const field: ValueField = { key: f.key, name: f.name, decimals: f.decimals };
      if (f.unit !== undefined) field.unit = f.unit;
      if (f.min !== undefined) field.min = f.min;
      if (f.max !== undefined) field.max = f.max;
      return field;
    }),
    dailyReset: i.dailyReset,
    favorite: i.favorite,
    sortOrder: i.sortOrder,
    archived: i.archived,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
  if (i.label !== undefined) item.label = i.label;
  if (i.memo !== undefined) item.memo = i.memo;
  return item;
}

function pickEntry(e: Entry): Entry {
  const entry: Entry = {
    id: e.id,
    itemId: e.itemId,
    timestamp: e.timestamp,
    createdAt: e.createdAt,
  };
  if (e.values !== undefined) entry.values = { ...e.values };
  if (e.note !== undefined) entry.note = e.note;
  return entry;
}

export function validateBackup(raw: unknown): ValidationResult {
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT)
    return { ok: false, error: 'Die Datei ist kein Klicker-Backup.' };
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION)
    return {
      ok: false,
      error: 'Das Backup stammt aus einer neueren App-Version. Bitte die App aktualisieren.',
    };
  if (!Array.isArray(raw.items) || !Array.isArray(raw.entries))
    return { ok: false, error: 'Das Backup ist unvollständig.' };

  const badItem = raw.items.findIndex((i) => !validItem(i));
  if (badItem >= 0) return { ok: false, error: `Item Nr. ${badItem + 1} ist ungültig.` };
  const badEntry = raw.entries.findIndex((e) => !validEntry(e));
  if (badEntry >= 0) return { ok: false, error: `Eintrag Nr. ${badEntry + 1} ist ungültig.` };

  const items = (raw.items as Item[]).map(pickItem);
  const ids = new Set(items.map((i) => i.id));
  if (ids.size !== items.length) return { ok: false, error: 'Das Backup enthält doppelte Items.' };
  const entries = (raw.entries as Entry[]).map(pickEntry);
  if (entries.some((e) => !ids.has(e.itemId)))
    return { ok: false, error: 'Das Backup enthält Einträge ohne zugehöriges Item.' };

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: isStr(raw.exportedAt, 64) ? raw.exportedAt : '',
      appVersion: isStr(raw.appVersion, 32) ? raw.appVersion : '',
      items,
      entries,
    },
  };
}

export function parseBackup(text: string): ValidationResult {
  try {
    return validateBackup(JSON.parse(text));
  } catch {
    return { ok: false, error: 'Die Datei konnte nicht gelesen werden (kein gültiges JSON).' };
  }
}

// ---------- CSV (für Excel/Numbers; deutsches Format) ----------

const csvCell = (v: string) => (/[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Ein Wert je Zeile („langes Format“): Zähler-Einträge ergeben eine Zeile ohne Wert,
 * Wert-Einträge eine Zeile je Feld. Trennzeichen Semikolon, Dezimalkomma, UTF-8 mit BOM.
 */
export function entriesToCsv(items: Item[], entries: Entry[]): string {
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows: string[][] = [
    ['Zeitpunkt', 'Item', 'Label', 'Art', 'Feld', 'Wert', 'Einheit', 'Notiz'],
  ];
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  for (const e of sorted) {
    const item = byId.get(e.itemId);
    if (!item) continue;
    const base = [
      format(e.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      item.name,
      item.label ?? '',
      item.type === 'counter' ? 'Zähler' : 'Wert',
    ];
    const note = e.note ?? '';
    if (item.type === 'counter') {
      rows.push([...base, '', '', '', note]);
      continue;
    }
    for (const f of item.fields) {
      const v = e.values?.[f.key];
      if (v === undefined) continue;
      rows.push([
        ...base,
        f.name,
        formatDecimal(v, f.decimals).replace(/\./g, ''),
        f.unit ?? '',
        note,
      ]);
    }
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
