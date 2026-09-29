import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Да',
  cancelLabel = 'Нет',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Esc → закрыть
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  // Блокировка скролла
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
        style={{
          backgroundColor: 'var(--site-card)',
          border: '1px solid var(--site-border)',
          boxShadow: '0 24px 60px -20px rgba(0, 0, 0, 0.3)',
          animation: 'dialogPop 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Цветная полоска сверху */}
        <div
          style={{
            height: 3,
            backgroundColor: danger
              ? 'var(--tag-destructive)'
              : 'var(--gold)',
          }}
        />

        <div className="p-6">
          <h3
            className="font-serif text-2xl font-bold mb-3"
            style={{ color: 'var(--site-text)' }}
          >
            {title}
          </h3>

          {message && (
            <p
              className="text-[14px] leading-relaxed mb-6"
              style={{ color: 'var(--site-muted)' }}
            >
              {message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 text-[11px] uppercase font-bold"
              style={{
                letterSpacing: '0.12em',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className="flex-1 py-3 text-[11px] uppercase font-bold"
              style={{
                letterSpacing: '0.12em',
                backgroundColor: danger
                  ? 'var(--tag-destructive)'
                  : 'var(--site-text)',
                color: danger ? '#000' : 'var(--site-bg)',
                border: '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}