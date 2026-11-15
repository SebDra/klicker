import type { Entry } from '../db/types';
import { startOfDay } from './time';

export interface DayGroup {
  /** Tagesbeginn (lokal) */
  day: number;
  entries: Entry[];
}

/** Gruppiert (absteigend sortierte) Einträge nach Kalendertag; Reihenfolge bleibt erhalten. */
export function groupByDay(entries: Entry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of entries) {
    const day = startOfDay(e.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(e);
    else groups.push({ day, entries: [e] });
  }
  return groups;
}

const dayFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** „Heute“, „Gestern“ oder z. B. „Sa., 14.11.2026“. */
export function formatDayHeading(day: number, now: number = Date.now()): string {
  const today = startOfDay(now);
  if (day === today) return 'Heute';
  if (day === startOfDay(today - 1)) return 'Gestern';
  return dayFmt.format(day);
}

const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

export function formatTime(ts: number): string {
  return timeFmt.format(ts);
}
