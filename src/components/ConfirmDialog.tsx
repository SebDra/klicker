import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { de } from '../i18n/de';
import { useModalBehavior } from './useModalBehavior';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descId = useId();
  useModalBehavior(open, onCancel);
  if (!open) return null;

  return createPortal(
    <div className="overlay center" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <div id={descId} className="modal-body">
          {children}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onCancel} autoFocus>
            {de.common.cancel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
