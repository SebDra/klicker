import type { Entry, Item } from '../db/types';
import { backupFileName, createBackup, entriesToCsv, parseBackup, validateBackup } from './backup';

const item = (patch: Partial<Item> = {}): Item => ({
  id: 'i1',
  name: 'Wasser',
  icon: '💧',
  type: 'counter',
  fields: [],
  dailyReset: true,
  favorite: false,
  sortOrder: 1,
  archived: false,
  createdAt: 1,
  updatedAt: 1,
  ...patch,
});

const weight = item({
  id: 'i2',
  name: 'Gewicht; morgens',
  label: 'Gewicht',
  type: 'value',
  fields: [{ key: 'w', name: 'Gewicht', unit: 'kg', decimals: 1 }],
});

const at = (h: number) => new Date(2026, 10, 15, h, 5, 9).getTime();
const entries: Entry[] = [
  {
    id: 'e2',
    itemId: 'i2',
    timestamp: at(8),
    createdAt: 1,
    values: { w: 1072.5 },
    note: 'nach "Sport"',
  },
  { id: 'e1', itemId: 'i1', timestamp: at(7), createdAt: 1 },
];

describe('Backup', () => {
  it('Hin- und Rückweg ohne Verlust', () => {
    const backup = createBackup([item(), weight], entries, '0.1.0', at(9));
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.items).toEqual([item(), weight]);
      expect(result.backup.entries).toEqual(entries);
    }
  });

  it('verwirft unbekannte Zusatzfelder', () => {
    const backup = createBackup([{ ...item(), evil: '<script>' } as Item], [], '0.1.0');
    const result = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(result.ok && result.backup.items[0]).not.toHaveProperty('evil');
  });

  it.each([
    ['kein JSON', '{oops', /kein gültiges JSON/],
    ['fremde Datei', '{"hello":1}', /kein Klicker-Backup/],
    [
      'neuere Version',
      '{"format":"klicker-backup","version":99,"items":[],"entries":[]}',
      /neueren App-Version/,
    ],
    [
      'ungültiges Item',
      JSON.stringify(createBackup([item({ name: '' })], [], '1')),
      /Item Nr. 1 ist ungültig/,
    ],
    [
      'zu langer Bezeichner',
      JSON.stringify(createBackup([item({ name: 'x'.repeat(61) })], [], '1')),
      /Item Nr. 1/,
    ],
    [
      'Eintrag ohne Item',
      JSON.stringify(createBackup([item()], [{ ...entries[1]!, itemId: 'weg' }], '1')),
      /ohne zugehöriges Item/,
    ],
    ['doppelte Items', JSON.stringify(createBackup([item(), item()], [], '1')), /doppelte Items/],
    [
      'Wert ist keine Zahl',
      JSON.stringify(
        createBackup([weight], [{ ...entries[0]!, values: { w: '72' as unknown as number } }], '1'),
      ),
      /Eintrag Nr. 1/,
    ],
  ])('lehnt ab: %s', (_, text, message) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });

  it('Dateinamen mit Datum', () => {
    expect(backupFileName('json', at(9))).toBe('klicker-backup-2026-11-15-0905.json');
    expect(backupFileName('csv', at(9))).toBe('klicker-eintraege-2026-11-15-0905.csv');
  });
});

describe('CSV', () => {
  it('chronologisch, Semikolon, Dezimalkomma, Maskierung, BOM', () => {
    const csv = entriesToCsv([item(), weight], entries);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Zeitpunkt;Item;Label;Art;Feld;Wert;Einheit;Notiz',
      '2026-11-15 07:05:09;Wasser;;Zähler;;;;',
      '2026-11-15 08:05:09;"Gewicht; morgens";Gewicht;Wert;Gewicht;1072,5;kg;"nach ""Sport"""',
      '',
    ]);
  });
});
