import { useState } from 'react';
import { Link } from 'react-router-dom';
import { backupAgeDays, pickReminder, SNOOZE_DAYS } from '../../domain/reminder';
import { DAY_MS } from '../../domain/time';
import { de } from '../../i18n/de';
import { isMobile, isStandalone } from '../../platform/install';
import { getNumberPref, PREF, setPref } from '../../platform/prefs';

/** Ein dezenter Hinweis (Installation oder Backup) oberhalb der Kacheln. */
export function ReminderBanner({ entries }: { entries: number }) {
  const [snoozedUntil, setSnoozedUntil] = useState(() => getNumberPref(PREF.reminderSnooze));
  const now = Date.now();
  const lastBackup = getNumberPref(PREF.lastBackup);
  const reminder = pickReminder({
    mobile: isMobile(),
    standalone: isStandalone(),
    entries,
    lastBackup,
    snoozedUntil,
    now,
  });
  if (!reminder) return null;

  const snooze = () => {
    const until = Date.now() + SNOOZE_DAYS * DAY_MS;
    setPref(PREF.reminderSnooze, String(until));
    setSnoozedUntil(until);
  };

  return (
    <div className="banner" role="note">
      <p>
        {reminder === 'install'
          ? `📲 ${de.reminder.install}`
          : `💾 ${de.reminder.backup(backupAgeDays(lastBackup, now))}`}
      </p>
      <div className="banner-actions">
        <button type="button" className="btn ghost" onClick={snooze}>
          {de.reminder.later}
        </button>
        <Link to="/settings" className="btn secondary">
          {de.reminder.action}
        </Link>
      </div>
    </div>
  );
}
