import { useEffect, useRef } from 'react';
import { de } from '../i18n/de';

interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  /** Anzeigedauer in ms */
  duration?: number;
}

/** Kurzer Hinweis über der Navigation. Für jede neue Meldung mit neuem `key` rendern. */
export function Toast({ message, actionLabel, onAction, onClose, duration = 5000 }: Props) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const t = window.setTimeout(() => closeRef.current(), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      {actionLabel && onAction && (
        <button type="button" className="primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      <button type="button" aria-label={de.common.close} onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
