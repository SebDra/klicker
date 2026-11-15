import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { de } from '../i18n/de';
import { useModalBehavior } from './useModalBehavior';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Von unten einfahrendes Panel – gut mit dem Daumen erreichbar. */
export function BottomSheet({ open, title, onClose, children }: Props) {
  const titleId = useId();
  useModalBehavior(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            {de.common.close}
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
