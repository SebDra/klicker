import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  getISOWeek,
  parseISO,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import type { Entry, Item, ValueField } from '../db/types';
import { displayName } from './item';

// ---------- Zeitabschnitte ----------

export type Granularity = 'hour' | 'day' | 'week' | 'month';
export const GRANULARITIES: Granularity[] = ['hour', 'day', 'week', 'month'];

/** Mehr Abschnitte sind am Handy nicht mehr lesbar (z. B. Stunden über ~2 Wochen). */
export const MAX_BUCKETS = 400;

export function bucketStart(ts: number, g: Granularity): number {
  switch (g) {
    case 'hour':
      return startOfHour(ts).getTime();
    case 'day':
      return startOfDay(ts).getTime();
    case 'week':
      return startOfWeek(ts, { weekStartsOn: 1 }).getTime(); // ISO: Montag
    case 'month':
      return startOfMonth(ts).getTime();
  }
}

export function nextBucket(ts: number, g: Granularity): number {
  switch (g) {
    case 'hour':
      return addHours(ts, 1).getTime();
    case 'day':
      return addDays(ts, 1).getTime();
    case 'week':
      return addWeeks(ts, 1).getTime();
    case 'month':
      return addMonths(ts, 1).getTime();
  }
}

/** Abschnittsanfänge von `start` (inkl.) bis `end` (exkl.); `undefined`, wenn mehr als `max`. */
export function makeBuckets(
  start: number,
  end: number,
  g: Granularity,
  max = MAX_BUCKETS,
): number[] | undefined {
  const result: number[] = [];
  for (let t = bucketStart(start, g); t < end; t = nextBucket(t, g)) {
    if (result.length >= max) return undefined;
    result.push(t);
  }
  return result;
}

export function bucketLabel(ts: number, g: Granularity): string {
  switch (g) {
    case 'hour':
      return format(ts, 'dd.MM. HH:mm');
    case 'day':
      return format(ts, 'dd.MM.');
    case 'week':
      return `KW ${getISOWeek(ts)}`;
    case 'month':
      return format(ts, 'MMM yy', { locale: deLocale });
  }
}

/** Ausführliche Bezeichnung für Tooltip und Tabelle. */
export function bucketLabelLong(ts: number, g: Granularity): string {
  switch (g) {
    case 'hour':
      return `${format(ts, 'EEE, dd.MM.yyyy', { locale: deLocale })}, ${format(ts, 'HH:00')}–${format(ts, 'HH:59')} Uhr`;
    case 'day':
      return format(ts, 'EEEE, dd.MM.yyyy', { locale: deLocale });
    case 'week':
      return `KW ${getISOWeek(ts)}: ${format(ts, 'dd.MM.')}–${format(addDays(ts, 6), 'dd.MM.yyyy')}`;
    case 'month':
      return format(ts, 'MMMM yyyy', { locale: deLocale });
  }
}

// ---------- Zeiträume ----------

export type RangePreset = '7d' | '30d' | '3m' | '1y' | 'custom';
export const RANGE_PRESETS: Exclude<RangePreset, 'custom'>[] = ['7d', '30d', '3m', '1y'];

/** Datumswerte im Format von `<input type="date">` (yyyy-MM-dd). */
export interface DateRange {
  from: string;
  to: string;
}

const isoDate = (d: Date | number) => format(d, 'yyyy-MM-dd');

export function presetRange(preset: Exclude<RangePreset, 'custom'>, now: number): DateRange {
  const to = new Date(now);
  const from = {
    '7d': () => subDays(to, 6),
    '30d': () => subDays(to, 29),
    '3m': () => addDays(subMonths(to, 3), 1),
    '1y': () => addDays(subYears(to, 1), 1),
  }[preset]();
  return { from: isoDate(from), to: isoDate(to) };
}

/** Zeitraum in ms: `from` 00:00 bis Ende von `to` (exklusiv). */
export function rangeToTimes(range: DateRange): { start: number; end: number } | undefined {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return undefined;
  return { start: startOfDay(from).getTime(), end: addDays(startOfDay(to), 1).getTime() };
}

/** Sinnvolle Einteilung für einen Zeitraum. */
export function suggestGranularity(range: DateRange): Granularity {
  const days = differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
  if (days <= 2) return 'hour';
  if (days <= 62) return 'day';
  if (days <= 200) return 'week';
  return 'month';
}

// ---------- Datenreihen ----------

export const MAX_SERIES = 8;
export const COUNT_UNIT = 'Anzahl';

export interface ChartSeries {
  /** Stabil: itemId bzw. itemId:fieldKey */
  id: string;
  name: string;
  kind: 'count' | 'value';
  unit: string;
  decimals: number;
  /** Anzahl bzw. Mittelwert je Abschnitt; null = keine Messung */
  values: (number | null)[];
  min: (number | null)[];
  max: (number | null)[];
  /** Anzahl Einträge/Messungen je Abschnitt */
  n: number[];
}

export interface ChartPanel {
  unit: string;
  series: ChartSeries[];
}

export interface SeriesDef {
  id: string;
  item: Item;
  field?: ValueField;
}

/** Reihen der gewählten Items (Zähler: eine Reihe, Wert-Items: eine je Feld). */
export function seriesDefs(items: Item[]): SeriesDef[] {
  return items.flatMap((item): SeriesDef[] =>
    item.type === 'counter'
      ? [{ id: item.id, item }]
      : item.fields.map((field) => ({ id: `${item.id}:${field.key}`, item, field })),
  );
}

function indexOfBucket(buckets: number[], ts: number): number {
  let lo = 0;
  let hi = buckets.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (buckets[mid]! <= ts) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/**
 * Aggregiert die Einträge je Abschnitt und gruppiert die Reihen nach Einheit
 * (ein Diagramm je Einheit statt zweiter Y-Achse). Höchstens `MAX_SERIES` Reihen.
 */
export function buildChart(
  items: Item[],
  entries: Entry[],
  buckets: number[],
  end: number,
): { panels: ChartPanel[]; truncated: boolean } {
  const defs = seriesDefs(items);
  const truncated = defs.length > MAX_SERIES;
  const n = buckets.length;

  const series: ChartSeries[] = defs.slice(0, MAX_SERIES).map(({ id, item, field }) => {
    const multi = item.type === 'value' && item.fields.length > 1;
    return {
      id,
      name: field && multi ? `${displayName(item)} · ${field.name}` : displayName(item),
      kind: field ? 'value' : 'count',
      unit: field ? (field.unit ?? '') : COUNT_UNIT,
      decimals: field?.decimals ?? 0,
      values: Array<number | null>(n).fill(field ? null : 0),
      min: Array<number | null>(n).fill(null),
      max: Array<number | null>(n).fill(null),
      n: Array<number>(n).fill(0),
    };
  });

  const byItem = new Map<string, { s: ChartSeries; key?: string }[]>();
  defs.slice(0, MAX_SERIES).forEach((d, i) => {
    const list = byItem.get(d.item.id) ?? [];
    list.push({ s: series[i]!, key: d.field?.key });
    byItem.set(d.item.id, list);
  });

  const sums = new Map<ChartSeries, number[]>();
  for (const e of entries) {
    if (e.timestamp >= end) continue;
    const b = indexOfBucket(buckets, e.timestamp);
    if (b < 0) continue;
    for (const { s, key } of byItem.get(e.itemId) ?? []) {
      if (s.kind === 'count') {
        s.values[b] = (s.values[b] ?? 0) + 1;
        s.n[b]!++;
        continue;
      }
      const v = key !== undefined ? e.values?.[key] : undefined;
      if (v === undefined) continue;
      const sum = sums.get(s) ?? Array<number>(n).fill(0);
      sums.set(s, sum);
      sum[b]! += v;
      s.n[b]!++;
      s.min[b] = s.min[b] === null ? v : Math.min(s.min[b]!, v);
      s.max[b] = s.max[b] === null ? v : Math.max(s.max[b]!, v);
    }
  }
  for (const [s, sum] of sums) {
    s.values = sum.map((total, i) => (s.n[i] ? total / s.n[i]! : null));
  }

  const panels: ChartPanel[] = [];
  for (const s of series) {
    const panel = panels.find((p) => p.unit === s.unit);
    if (panel) panel.series.push(s);
    else panels.push({ unit: s.unit, series: [s] });
  }
  return { panels, truncated };
}

/**
 * Farbe folgt der Reihe, nicht ihrer Position: bestehende Zuordnungen bleiben,
 * neue Reihen erhalten den niedrigsten freien Platz (0..slots-1).
 */
export function assignColors(
  ids: string[],
  previous: Record<string, number>,
  slots = MAX_SERIES,
): Record<string, number> {
  const result: Record<string, number> = {};
  const used = new Set<number>();
  for (const id of ids) {
    const slot = previous[id];
    if (slot !== undefined && slot < slots && !used.has(slot)) {
      result[id] = slot;
      used.add(slot);
    }
  }
  for (const id of ids) {
    if (result[id] !== undefined) continue;
    let slot = 0;
    while (used.has(slot) && slot < slots) slot++;
    if (slot >= slots) break;
    result[id] = slot;
    used.add(slot);
  }
  return result;
}
