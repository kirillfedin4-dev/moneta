import { useState, useEffect } from 'react';
import { useLiveFeed, type LiveFeedItem } from '@/hooks/useLiveFeed';
import { useAuth } from '@/contexts/AuthContext';
import { isMuted, setMuted } from '@/lib/sound';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return 'только что';
  if (diff < 60) return `${diff} сек назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  return `${Math.floor(diff / 3600)} ч назад`;
}

export function LiveFeed() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const { items, online } = useLiveFeed({
    currentUsername: user?.username,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const lastItem = items[0];
  const lastIsRecent =
    lastItem && Date.now() - new Date(lastItem.createdAt).getTime() < 3000;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 px-5 py-3 flex items-center gap-3 ${
          !open && lastIsRecent ? 'soft-pulse' : ''
        }`}
        style={{
          backgroundColor: 'var(--site-text)',
          color: 'var(--site-bg)',
          border: '1px solid var(--gold)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          letterSpacing: '0.12em',
          cursor: 'pointer',
        }}
      >
<span className="relative flex h-2 w-2">
  <span
    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
    style={{ backgroundColor: 'var(--gold)' }}
  />
  <span
    className="relative inline-flex rounded-full h-2 w-2"
    style={{ backgroundColor: 'var(--gold)' }}
  />
</span>
<span className="text-[11px] uppercase font-bold" style={{ color: 'var(--gold)' }}>
  Live · {online}
</span>
      </button>

      {/* Затемнение */}
      <div
        className="fixed inset-0 z-40"
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
        }}
        onClick={() => setOpen(false)}
      />

      {/* Offcanvas */}
      <aside
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--site-card)',
          borderLeft: '1px solid var(--site-border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Шапка */}
        <div
          className="p-5 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--site-line)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: 'var(--tag-destructive)' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: 'var(--tag-destructive)' }}
                />
              </span>
              <p
                className="text-[10px] uppercase font-bold"
                style={{ letterSpacing: '0.2em', color: 'var(--gold)' }}
              >
                Live · {online} онлайн
              </p>
            </div>
            <h3
              className="font-serif text-2xl font-bold"
              style={{ color: 'var(--site-text)' }}
            >
              Лента ставок
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 flex items-center justify-center text-sm font-bold"
              style={{
                color: 'var(--site-muted)',
                border: '1px solid var(--site-border)',
                cursor: 'pointer',
              }}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted ? '×' : '♪'}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-9 h-9 flex items-center justify-center text-lg font-bold"
              style={{
                color: 'var(--site-muted)',
                border: '1px solid var(--site-border)',
                cursor: 'pointer',
              }}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>

        {/* Лента */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p
                className="font-serif text-4xl mb-3"
                style={{ color: 'var(--site-border)' }}
              >
                ◌
              </p>
              <p
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--site-muted)' }}
              >
                Пока тихо
              </p>
              <p
                className="text-[12px] italic"
                style={{ color: 'var(--site-muted)' }}
              >
                Как только кто-то сделает ставку — она появится здесь
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <LiveFeedRow
                key={item.id}
                item={item}
                isNew={
                  idx === 0 &&
                  Date.now() - new Date(item.createdAt).getTime() < 3000
                }
                isMine={item.username === user?.username}
                tick={tick}
              />
            ))
          )}
        </div>

        {/* Футер */}
        <div
          className="p-4 shrink-0"
          style={{ borderTop: '1px solid var(--site-line)' }}
        >
          <p
            className="text-[10px] uppercase font-bold text-center"
            style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
          >
            Ставки обновляются в реальном времени
          </p>
        </div>
      </aside>
    </>
  );
}

function LiveFeedRow({
  item,
  isNew,
  isMine,
  tick,
}: {
  item: LiveFeedItem;
  isNew: boolean;
  isMine: boolean;
  tick: number;
}) {
  const [flash, setFlash] = useState(isNew);
  const [justAppeared] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isNew]);

  const borderColor = flash
    ? 'var(--gold)'
    : isMine
      ? 'var(--tag-accent)'
      : 'transparent';

  const bgColor = flash
    ? 'var(--gold-soft)'
    : isMine
      ? 'rgba(10, 157, 255, 0.06)'
      : 'var(--site-bg)';

  return (
    <a
      href={`/coin/${item.auctionId}`}
      className={`block p-3 ${justAppeared ? 'feed-new' : ''}`}
      style={{
        backgroundColor: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        textDecoration: 'none',
        transition: 'background-color 500ms ease',
      }}
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className="text-[11px] uppercase font-bold truncate"
              style={{
                letterSpacing: '0.1em',
                color: isMine ? 'var(--tag-accent)' : 'var(--site-muted)',
              }}
            >
              {item.username}
            </p>
            {isMine && (
              <span
                className="text-[9px] uppercase font-bold px-1.5 py-0.5"
                style={{
                  backgroundColor: 'var(--tag-accent)',
                  color: '#000',
                  letterSpacing: '0.1em',
                }}
              >
                Вы
              </span>
            )}
          </div>
          {item.coinName && (
            <p
              className="text-[12px] font-medium truncate mt-0.5"
              style={{ color: 'var(--site-text)' }}
            >
              {item.coinName}
            </p>
          )}
        </div>
        <p
          className="font-serif text-lg font-bold tabular-nums whitespace-nowrap"
          style={{ color: 'var(--site-text)' }}
        >
          {item.amount.toLocaleString('ru-RU')}
          <span className="text-sm ml-1" style={{ color: 'var(--gold)' }}>
            ₽
          </span>
        </p>
      </div>
      <p
        className="text-[10px] font-medium"
        style={{ color: 'var(--site-muted)' }}
      >
        {timeAgo(item.createdAt)}
      </p>
    </a>
  );
}