import { LIMITS, type Entry, type Item } from '../db/types';
import { formatDecimal, parseDecimal } from './number';
import { fromDateTimeLocal, toDateTimeLocal } from './time';

export interface EntryForm {
  /** fieldKey → Eingabetext */
  values: Record<string, string>;
  /** datetime-local */
  when: string;
  note: string;
}

export interface EntryFormErrors {
  values?: Record<string, string>;
  when?: string;
  note?: string;
  form?: string;
}

/** Kleine Toleranz, damit Uhrzeit-Rundung auf Minuten nicht als Zukunft gilt. */
const FUTURE_TOLERANCE_MS = 60_000;

export function emptyEntryForm(now: number): EntryForm {
  return { values: {}, when: toDateTimeLocal(now), note: '' };
}

export function validateEntryForm(item: Item, form: EntryForm, now: number): EntryFormErrors {
  const e: EntryFormErrors = {};

  if (item.type === 'value') {
    const valueErrors: Record<string, string> = {};
    let filled = 0;
    for (const f of item.fields) {
      const raw = form.values[f.key] ?? '';
      const v = parseDecimal(raw);
      if (v === undefined) continue;
      filled++;
      if (Number.isNaN(v)) valueErrors[f.key] = 'Keine gültige Zahl.';
      else if (f.min !== undefined && v < f.min)
        valueErrors[f.key] = `Mindestens ${formatDecimal(f.min, f.decimals)}.`;
      else if (f.max !== undefined && v > f.max)
        valueErrors[f.key] = `Höchstens ${formatDecimal(f.max, f.decimals)}.`;
    }
    if (filled === 0) e.form = 'Bitte mindestens einen Wert eingeben.';
    if (Object.keys(valueErrors).length > 0) e.values = valueErrors;
  }

  const ts = fromDateTimeLocal(form.when);
  if (ts === undefined) e.when = 'Ungültiger Zeitpunkt.';
  else if (ts > now + FUTURE_TOLERANCE_MS) e.when = 'Der Zeitpunkt liegt in der Zukunft.';

  if (form.note.trim().length > LIMITS.note) e.note = `Höchstens ${LIMITS.note} Zeichen.`;
  return e;
}

export function hasEntryErrors(e: EntryFormErrors): boolean {
  return Object.keys(e).length > 0;
}

const round = (v: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
};

/**
 * Wandelt ein gültiges Formular in Eintragsdaten um. Werte werden auf die
 * konfigurierten Nachkommastellen gerundet. Liegt der gewählte Zeitpunkt in der
 * aktuellen Minute, wird die exakte Uhrzeit `now` verwendet.
 */
export function entryFormToData(
  item: Item,
  form: EntryForm,
  now: number,
): Pick<Entry, 'timestamp' | 'values' | 'note'> {
  const ts = fromDateTimeLocal(form.when) ?? now;
  const timestamp = form.when === toDateTimeLocal(now) ? now : ts;

  let values: Record<string, number> | undefined;
  if (item.type === 'value') {
    values = {};
    for (const f of item.fields) {
      const v = parseDecimal(form.values[f.key] ?? '');
      if (v !== undefined && !Number.isNaN(v)) values[f.key] = round(v, f.decimals);
    }
  }
  const note = form.note.trim() || undefined;
  return { timestamp, values, note };
}

/**
 * Kompakte Darstellung der Werte eines Eintrags, z. B. „120 / 80 / 65“ oder „72,5 kg“.
 * Die Einheit wird nur angehängt, wenn alle angezeigten Werte dieselbe haben.
 */
export function formatValues(item: Item, values: Record<string, number> | undefined): string {
  if (!values) return '';
  const shown = item.fields.filter((f) => values[f.key] !== undefined);
  if (shown.length === 0) return '';
  const text = shown.map((f) => formatDecimal(values[f.key]!, f.decimals)).join(' / ');
  const units = new Set(shown.map((f) => f.unit ?? ''));
  const [unit] = units;
  return units.size === 1 && unit ? `${text} ${unit}` : text;
}
