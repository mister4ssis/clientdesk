import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isOpen: boolean;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  isOpen,
  isBusy = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        <div className="dialog__actions">
          <button
            ref={cancelButtonRef}
            className="button button--secondary"
            type="button"
            disabled={isBusy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="button button--danger"
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
          >
            {isBusy ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
