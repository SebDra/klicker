import { useEffect, useState } from 'react';
import { nextMidnight, startOfDay } from '../domain/time';

/**
 * Beginn des aktuellen Tages; aktualisiert sich um Mitternacht und wenn die App
 * wieder sichtbar wird (Timer laufen im Hintergrund auf Handys nicht zuverlässig).
 */
export function useToday(): number {
  const [today, setToday] = useState(() => startOfDay(Date.now()));

  useEffect(() => {
    const update = () => setToday(startOfDay(Date.now()));
    const timer = window.setTimeout(update, nextMidnight(Date.now()) - Date.now() + 500);
    const onVisible = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [today]);

  return today;
}
