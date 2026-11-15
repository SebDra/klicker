import { useEffect, useState } from 'react';
import type { ColorScheme } from '../features/chart/palette';

function current(): ColorScheme {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark' || forced === 'light') return forced;
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Aktives Farbschema: `data-theme` am <html> hat Vorrang vor der Systemeinstellung. */
export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(current);

  useEffect(() => {
    const update = () => setScheme(current());
    const query =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : undefined;
    query?.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      query?.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return scheme;
}
