import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushToggle() {
  const { user } = useAuth();
  const { permission, enabled, requestPermission, disable } =
    usePushNotifications();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        disable();
      } else {
        await requestPermission();
      }
    } finally {
      setBusy(false);
    }
  };

  if (permission === 'denied') {
    return (
      <span
        title="Уведомления заблокированы в браузере"
        className="text-[11px] uppercase font-bold px-3 py-2 hidden md:inline-flex items-center"
        style={{
          letterSpacing: '0.15em',
          color: 'var(--site-muted)',
          opacity: 0.5,
          cursor: 'not-allowed',
        }}
      >
        Уведомления заблокированы
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="px-3 py-2 text-[11px] uppercase font-bold transition-opacity hover:opacity-70 hidden md:inline-flex items-center gap-2"
      style={{
        letterSpacing: '0.15em',
        color: enabled ? 'var(--gold)' : 'var(--site-muted)',
        border: '1px solid var(--site-border)',
        cursor: busy ? 'wait' : 'pointer',
        backgroundColor: enabled ? 'var(--gold-soft)' : 'transparent',
      }}
      title={enabled ? 'Выключить уведомления' : 'Включить уведомления'}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: enabled ? 'var(--gold)' : 'var(--site-border)',
          display: 'inline-block',
        }}
      />
      {enabled ? 'Push вкл' : 'Push выкл'}
    </button>
  );
}