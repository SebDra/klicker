import type { Entry, Item } from '../db/types';
import {
  assignColors,
  bucketLabel,
  bucketLabelLong,
  bucketStart,
  buildChart,
  makeBuckets,
  presetRange,
  rangeToTimes,
  suggestGranularity,
} from './chart';

const at = (y: number, mo: number, d: number, h = 0, mi = 0) =>
  new Date(y, mo - 1, d, h, mi).getTime();

const base = {
  icon: '⭐',
  dailyReset: true,
  favorite: false,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
};
const counter = (id: string, name = id): Item => ({
  ...base,
  id,
  name,
  type: 'counter',
  fields: [],
  sortOrder: 1,
});
const bp: Item = {
  ...base,
  id: 'bp',
  name: 'Blutdruck',
  type: 'value',
  sortOrder: 2,
  fields: [
    { key: 'sys', name: 'Systole', unit: 'mmHg', decimals: 0 },
    { key: 'dia', name: 'Diastole', unit: 'mmHg', decimals: 0 },
    { key: 'pul', name: 'Puls', unit: 'bpm', decimals: 0 },
  ],
};
let seq = 0;
const entry = (itemId: string, timestamp: number, values?: Record<string, number>): Entry => ({
  id: `e${++seq}`,
  itemId,
  timestamp,
  createdAt: timestamp,
  values,
});

describe('Zeitabschnitte', () => {
  it('Wochen beginnen am Montag (ISO), Monate am 1.', () => {
    expect(bucketStart(at(2026, 11, 15, 12), 'week')).toBe(at(2026, 11, 9)); // So → Mo
    expect(bucketStart(at(2026, 11, 15, 12), 'month')).toBe(at(2026, 11, 1));
    expect(bucketStart(at(2026, 11, 15, 12, 40), 'hour')).toBe(at(2026, 11, 15, 12));
  });

  it('erzeugt Abschnitte über die Zeitumstellung hinweg', () => {
    const days = makeBuckets(at(2026, 10, 24), at(2026, 10, 27), 'day')!;
    expect(days).toEqual([at(2026, 10, 24), at(2026, 10, 25), at(2026, 10, 26)]);
    // 25.10.: 25 Stunden
    expect(makeBuckets(at(2026, 10, 25), at(2026, 10, 26), 'hour')).toHaveLength(25);
  });

  it('verweigert zu viele Abschnitte', () => {
    expect(makeBuckets(at(2026, 1, 1), at(2027, 1, 1), 'hour')).toBeUndefined();
    expect(makeBuckets(at(2026, 1, 1), at(2027, 1, 1), 'day')).toHaveLength(365);
  });

  it('beschriftet deutsch', () => {
    expect(bucketLabel(at(2026, 11, 9), 'week')).toBe('KW 46');
    expect(bucketLabel(at(2026, 3, 1), 'month')).toBe('März 26');
    expect(bucketLabel(at(2026, 11, 15), 'day')).toBe('15.11.');
    expect(bucketLabelLong(at(2026, 11, 9), 'week')).toBe('KW 46: 09.11.–15.11.2026');
    expect(bucketLabelLong(at(2026, 11, 15, 14), 'hour')).toBe('So., 15.11.2026, 14:00–14:59 Uhr');
  });
});

describe('Zeiträume', () => {
  const now = at(2026, 11, 15, 18);
  it('Vorgaben enden heute', () => {
    expect(presetRange('7d', now)).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    expect(presetRange('30d', now)).toEqual({ from: '2026-10-17', to: '2026-11-15' });
    expect(presetRange('3m', now)).toEqual({ from: '2026-08-16', to: '2026-11-15' });
    expect(presetRange('1y', now)).toEqual({ from: '2025-11-16', to: '2026-11-15' });
  });

  it('rechnet Datumsbereiche in Zeiten um (Ende exklusiv)', () => {
    expect(rangeToTimes({ from: '2026-11-09', to: '2026-11-15' })).toEqual({
      start: at(2026, 11, 9),
      end: at(2026, 11, 16),
    });
    expect(rangeToTimes({ from: '2026-11-15', to: '2026-11-09' })).toBeUndefined();
    expect(rangeToTimes({ from: '', to: '2026-11-09' })).toBeUndefined();
  });

  it('schlägt eine passende Einteilung vor', () => {
    expect(suggestGranularity({ from: '2026-11-15', to: '2026-11-15' })).toBe('hour');
    expect(suggestGranularity(presetRange('30d', now))).toBe('day');
    expect(suggestGranularity(presetRange('3m', now))).toBe('week');
    expect(suggestGranularity(presetRange('1y', now))).toBe('month');
  });
});

describe('buildChart', () => {
  const buckets = makeBuckets(at(2026, 11, 13), at(2026, 11, 16), 'day')!;
  const end = at(2026, 11, 16);

  it('zählt je Abschnitt und gruppiert nach Einheit', () => {
    const wasser = counter('w', 'Wasser');
    const entries = [
      entry('w', at(2026, 11, 13, 8)),
      entry('w', at(2026, 11, 13, 9)),
      entry('w', at(2026, 11, 15, 23, 59)),
      entry('w', at(2026, 11, 16, 0, 1)), // außerhalb
      entry('w', at(2026, 11, 12, 23)), // außerhalb
      entry('bp', at(2026, 11, 13, 7), { sys: 120, dia: 80, pul: 60 }),
      entry('bp', at(2026, 11, 13, 19), { sys: 130, dia: 90 }),
      entry('bp', at(2026, 11, 15, 7), { sys: 125, dia: 85, pul: 70 }),
    ];
    const { panels, truncated } = buildChart([wasser, bp], entries, buckets, end);
    expect(truncated).toBe(false);
    expect(panels.map((p) => p.unit)).toEqual(['Anzahl', 'mmHg', 'bpm']);

    const [count] = panels[0]!.series;
    expect(count!.values).toEqual([2, 0, 1]);

    const [sys, dia] = panels[1]!.series;
    expect(sys!.name).toBe('Blutdruck · Systole');
    expect(sys!.values).toEqual([125, null, 125]);
    expect(sys!.min).toEqual([120, null, 125]);
    expect(sys!.max).toEqual([130, null, 125]);
    expect(dia!.n).toEqual([2, 0, 1]);

    const [pul] = panels[2]!.series;
    expect(pul!.values).toEqual([60, null, 70]); // fehlender Puls zählt nicht mit
  });

  it('begrenzt auf 8 Reihen', () => {
    const items = Array.from({ length: 10 }, (_, i) => counter(`c${i}`));
    const { panels, truncated } = buildChart(items, [], buckets, end);
    expect(truncated).toBe(true);
    expect(panels[0]!.series).toHaveLength(8);
  });
});

describe('assignColors', () => {
  it('behält Farben beim Abwählen anderer Reihen', () => {
    const first = assignColors(['a', 'b', 'c'], {});
    expect(first).toEqual({ a: 0, b: 1, c: 2 });
    const after = assignColors(['b', 'c'], first);
    expect(after).toEqual({ b: 1, c: 2 });
    // Neue Reihe bekommt den frei gewordenen Platz
    expect(assignColors(['b', 'c', 'd'], after)).toEqual({ b: 1, c: 2, d: 0 });
  });

  it('ignoriert ungültige oder doppelte Altwerte', () => {
    expect(assignColors(['a', 'b'], { a: 3, b: 3 })).toEqual({ a: 3, b: 0 });
    expect(assignColors(['a'], { a: 99 })).toEqual({ a: 0 });
  });
});
