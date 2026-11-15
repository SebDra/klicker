// Zeitfunktionen arbeiten immer in lokaler Zeit (Sommer-/Winterzeit-sicher über Date-Setter).

export const DAY_MS = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function nextMidnight(ts: number): number {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Wert für `<input type="datetime-local">` (lokale Zeit, Minutengenauigkeit). */
export function toDateTimeLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return undefined;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const date = new Date(y, mo - 1, d, h, mi);
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
}

const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
const dateYearFmt = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Kurze, relative Zeitangabe: „heute 08:15“, „gestern 21:03“, „12.11. 08:15“. */
export function formatWhen(ts: number, now: number = Date.now()): string {
  const today = startOfDay(now);
  const day = startOfDay(ts);
  const time = timeFmt.format(ts);
  if (day === today) return `heute ${time}`;
  if (day === startOfDay(today - 1)) return `gestern ${time}`;
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return `${(sameYear ? dateFmt : dateYearFmt).format(ts)} ${time}`;
}
