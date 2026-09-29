import { useOutbidNotifications } from '@/hooks/useOutbidNotifications';

export function OutbidToasts() {
  const { notifications, dismiss } = useOutbidNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-24 right-6 z-50 space-y-3 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto max-w-sm"
          style={{
            backgroundColor: 'var(--site-card)',
            borderLeft: '4px solid var(--tag-destructive)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
            animation: 'slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="p-4">
            {/* Заголовок */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 flex items-center justify-center text-[12px] font-bold"
                  style={{
                    backgroundColor: 'var(--tag-destructive)',
                    color: '#000',
                    borderRadius: '50%',
                  }}
                >
                  ⚠
                </span>
                <p
                  className="text-[11px] uppercase font-bold"
                  style={{
                    letterSpacing: '0.15em',
                    color: 'var(--tag-destructive)',
                  }}
                >
                  Вашу ставку перебили
                </p>
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="w-6 h-6 flex items-center justify-center text-sm font-bold transition-opacity hover:opacity-60"
                style={{ color: 'var(--site-muted)' }}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            {/* Информация о лоте */}
            <p
              className="text-[13px] font-semibold mb-3 line-clamp-2"
              style={{ color: 'var(--site-text)' }}
            >
              {n.coinName}
            </p>

            {/* Ставки */}
            <div
              className="flex justify-between items-baseline pb-3 mb-3"
              style={{ borderBottom: '1px solid var(--site-line)' }}
            >
              <div>
                <p
                  className="text-[10px] uppercase font-bold mb-0.5"
                  style={{
                    letterSpacing: '0.15em',
                    color: 'var(--site-muted)',
                  }}
                >
                  Ваша
                </p>
                <p
                  className="font-serif text-sm font-bold tabular-nums"
                  style={{ color: 'var(--site-muted)' }}
                >
                  {n.yourAmount.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-[10px] uppercase font-bold mb-0.5"
                  style={{
                    letterSpacing: '0.15em',
                    color: 'var(--tag-destructive)',
                  }}
                >
                  Новая · {n.newBidder}
                </p>
                <p
                  className="font-serif text-lg font-bold tabular-nums"
                  style={{ color: 'var(--site-text)' }}
                >
                  {n.newAmount.toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>

            {/* CTA */}
            <a
              href={`/coin/${n.auctionId}`}
              className="block text-center py-2.5 text-[11px] uppercase font-bold transition-all hover:tracking-[0.15em]"
              style={{
                letterSpacing: '0.12em',
                backgroundColor: 'var(--site-text)',
                color: 'var(--site-bg)',
                textDecoration: 'none',
              }}
            >
              Перебить →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}