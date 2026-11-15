import { backupAgeDays, pickReminder } from './reminder';
import { DAY_MS } from './time';

const now = 100 * DAY_MS;
const base = { mobile: false, standalone: false, entries: 0, now };

describe('pickReminder', () => {
  it('Installation zuerst, aber nur mobil im Browser', () => {
    expect(pickReminder({ ...base, mobile: true })).toBe('install');
    expect(pickReminder({ ...base, mobile: true, standalone: true })).toBeNull();
    expect(pickReminder(base)).toBeNull();
  });

  it('Backup ab 10 Einträgen, wenn keins oder älter als 30 Tage', () => {
    expect(pickReminder({ ...base, entries: 9 })).toBeNull();
    expect(pickReminder({ ...base, entries: 10 })).toBe('backup');
    expect(pickReminder({ ...base, entries: 10, lastBackup: now - 30 * DAY_MS })).toBeNull();
    expect(pickReminder({ ...base, entries: 10, lastBackup: now - 31 * DAY_MS })).toBe('backup');
  });

  it('„Später“ blendet bis zum Ablauf aus', () => {
    expect(pickReminder({ ...base, entries: 50, snoozedUntil: now + 1 })).toBeNull();
    expect(pickReminder({ ...base, entries: 50, snoozedUntil: now })).toBe('backup');
  });

  it('Alter in ganzen Tagen', () => {
    expect(backupAgeDays(undefined, now)).toBeNull();
    expect(backupAgeDays(now - 45.5 * DAY_MS, now)).toBe(45);
  });
});
