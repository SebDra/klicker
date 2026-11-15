import { getPref, setPref } from './prefs';

export type ThemeChoice = 'system' | 'light' | 'dark';

export function getTheme(): ThemeChoice {
  const t = getPref('theme');
  return t === 'light' || t === 'dark' ? t : 'system';
}

/** Setzt `data-theme` am <html>; „system“ entfernt es, dann gilt die Geräteeinstellung. */
export function applyTheme(choice: ThemeChoice = getTheme()): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;

  // Farbe der Statusleiste anpassen (die media-Varianten in index.html gelten nur für „system“).
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const forMode = m.media.includes('dark') ? 'dark' : 'light';
    if (!m.dataset.media) m.dataset.media = m.media;
    m.media = choice === 'system' ? m.dataset.media : choice === forMode ? 'all' : 'not all';
  });
}

export function setTheme(choice: ThemeChoice): void {
  setPref('theme', choice === 'system' ? null : choice);
  applyTheme(choice);
}
