import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

const MOVE_TOLERANCE_PX = 10;

/**
 * Unterscheidet Antippen und langes Drücken (Touch, Maus, Stift).
 * Rechtsklick bzw. die Kontextmenü-Taste lösen ebenfalls `onLongPress` aus.
 */
export function useLongPress(onLongPress: () => void, onTap: () => void, delay = 500) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const trigger = () => {
    fired.current = true;
    clear();
    navigator.vibrate?.(10);
    onLongPress();
  };

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(trigger, delay);
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_TOLERANCE_PX) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: (e: MouseEvent) => {
      if (fired.current) {
        // Klick nach langem Drücken ignorieren
        fired.current = false;
        e.preventDefault();
        return;
      }
      onTap();
    },
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      // Android meldet langes Drücken zusätzlich als Kontextmenü – nur einmal auslösen.
      if (!fired.current) trigger();
    },
  };
}
