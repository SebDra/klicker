// Kleine, ausfallsichere Einstellungen im localStorage (z. B. privater Modus → kein Speicher).

export const PREF = {
  /** Zeitpunkt des letzten JSON-Exports (ms) */
  lastBackup: 'lastBackup',
  /** Hinweisbanner ausblenden bis (ms) */
  reminderSnooze: 'reminderSnooze',
} as const;

export function getPref(key: string): string | null {
  try {
    return localStorage.getItem(`klicker.${key}`);
  } catch {
    return null;
  }
}

export function setPref(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(`klicker.${key}`);
    else localStorage.setItem(`klicker.${key}`, value);
  } catch {
    // ignorieren – gilt dann nur bis zum Neuladen
  }
}

export function getNumberPref(key: string): number | undefined {
  const v = Number(getPref(key));
  return getPref(key) !== null && Number.isFinite(v) ? v : undefined;
}
