import { DAY_MS } from './time';

export type Reminder = 'install' | 'backup' | null;

export const BACKUP_MIN_ENTRIES = 10;
export const BACKUP_MAX_AGE_DAYS = 30;
export const SNOOZE_DAYS = 7;

/**
 * Höchstens ein Hinweis auf dem Dashboard, wichtigster zuerst:
 * 1. Mobil im Browser-Tab → installieren (sonst droht v. a. auf iOS Datenverlust)
 * 2. Genug Daten und kein/zu altes Backup → sichern
 */
export function pickReminder(s: {
  mobile: boolean;
  standalone: boolean;
  entries: number;
  lastBackup?: number;
  snoozedUntil?: number;
  now: number;
}): Reminder {
  if (s.snoozedUntil !== undefined && s.now < s.snoozedUntil) return null;
  if (s.mobile && !s.standalone) return 'install';
  if (
    s.entries >= BACKUP_MIN_ENTRIES &&
    (s.lastBackup === undefined || s.now - s.lastBackup > BACKUP_MAX_AGE_DAYS * DAY_MS)
  )
    return 'backup';
  return null;
}

export function backupAgeDays(lastBackup: number | undefined, now: number): number | null {
  return lastBackup === undefined ? null : Math.floor((now - lastBackup) / DAY_MS);
}
