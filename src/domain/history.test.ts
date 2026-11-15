import type { Entry, Item } from '../db/types';
import { entryFormToData, entryToForm, mergeValues } from './entry';
import { formatDayHeading, groupByDay } from './history';

const at = (d: number, h: number, mi = 0) => new Date(2026, 10, d, h, mi).getTime();
const entry = (id: string, timestamp: number, patch: Partial<Entry> = {}): Entry => ({
  id,
  itemId: 'i',
  timestamp,
  createdAt: timestamp,
  ...patch,
});

const weight: Item = {
  id: 'i',
  name: 'Gewicht',
  icon: '⚖️',
  type: 'value',
  fields: [{ key: 'w', name: 'Gewicht', unit: 'kg', decimals: 1 }],
  dailyReset: true,
  favorite: false,
  sortOrder: 1,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
};

describe('groupByDay', () => {
  it('gruppiert absteigend sortierte Einträge nach Tag', () => {
    const groups = groupByDay([
      entry('a', at(15, 20)),
      entry('b', at(15, 0, 5)),
      entry('c', at(14, 23, 59)),
      entry('d', at(12, 8)),
    ]);
    expect(groups.map((g) => g.entries.map((e) => e.id))).toEqual([['a', 'b'], ['c'], ['d']]);
    expect(groups[0]!.day).toBe(at(15, 0));
  });
});

describe('formatDayHeading', () => {
  const now = at(15, 18);
  it('Heute, Gestern, Wochentag mit Datum', () => {
    expect(formatDayHeading(at(15, 0), now)).toBe('Heute');
    expect(formatDayHeading(at(14, 0), now)).toBe('Gestern');
    expect(formatDayHeading(at(12, 0), now)).toBe('Do., 12.11.2026');
  });
});

describe('Eintrag bearbeiten', () => {
  const original = entry('e', at(14, 7, 30) + 42_000, { values: { w: 72.5 }, note: 'nüchtern' });

  it('füllt das Formular aus dem Eintrag', () => {
    expect(entryToForm(weight, original)).toEqual({
      values: { w: '72,5' },
      when: '2026-11-14T07:30',
      note: 'nüchtern',
    });
  });

  it('behält die sekundengenaue Zeit, solange die Minute nicht geändert wird', () => {
    const now = at(15, 18);
    const form = entryToForm(weight, original);
    expect(entryFormToData(weight, form, now, original.timestamp).timestamp).toBe(
      original.timestamp,
    );
    const moved = { ...form, when: '2026-11-14T08:00' };
    expect(entryFormToData(weight, moved, now, original.timestamp).timestamp).toBe(at(14, 8));
  });

  it('erhält Werte entfernter Felder', () => {
    expect(mergeValues(weight, { w: 70, old: 5 }, { w: 71 })).toEqual({ old: 5, w: 71 });
    expect(mergeValues({ ...weight, type: 'counter', fields: [] }, { x: 1 }, undefined)).toBe(
      undefined,
    );
  });
});
