import { formatWhen, fromDateTimeLocal, nextMidnight, startOfDay, toDateTimeLocal } from './time';

const local = (y: number, mo: number, d: number, h = 0, mi = 0) =>
  new Date(y, mo - 1, d, h, mi).getTime();

describe('Tagesgrenzen', () => {
  it('startOfDay liefert lokale Mitternacht', () => {
    expect(startOfDay(local(2026, 11, 15, 17, 30))).toBe(local(2026, 11, 15));
  });

  it('funktioniert an Tagen mit Zeitumstellung (23 bzw. 25 Stunden)', () => {
    // Sommerzeit-Beginn 29.03.2026, Ende 25.10.2026 in Europe/Berlin
    expect(nextMidnight(local(2026, 3, 29, 12)) - local(2026, 3, 29)).toBe(23 * 3_600_000);
    expect(nextMidnight(local(2026, 10, 25, 12)) - local(2026, 10, 25)).toBe(25 * 3_600_000);
    expect(startOfDay(local(2026, 3, 29, 23, 59))).toBe(local(2026, 3, 29));
  });
});

describe('datetime-local', () => {
  it('Hin- und Rückweg', () => {
    const ts = local(2026, 1, 5, 7, 9);
    expect(toDateTimeLocal(ts)).toBe('2026-01-05T07:09');
    expect(fromDateTimeLocal('2026-01-05T07:09')).toBe(ts);
  });

  it('akzeptiert Sekunden und lehnt Unsinn ab', () => {
    expect(fromDateTimeLocal('2026-01-05T07:09:30')).toBe(local(2026, 1, 5, 7, 9));
    expect(fromDateTimeLocal('')).toBeUndefined();
    expect(fromDateTimeLocal('gestern')).toBeUndefined();
  });
});

describe('formatWhen', () => {
  const now = local(2026, 11, 15, 18);
  it('heute / gestern / Datum', () => {
    expect(formatWhen(local(2026, 11, 15, 8, 5), now)).toBe('heute 08:05');
    expect(formatWhen(local(2026, 11, 14, 21, 3), now)).toBe('gestern 21:03');
    expect(formatWhen(local(2026, 11, 2, 9, 0), now)).toBe('02.11. 09:00');
    expect(formatWhen(local(2025, 12, 31, 9, 0), now)).toBe('31.12.2025 09:00');
  });
});
