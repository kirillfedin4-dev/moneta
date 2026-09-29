import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://localhost:4000/api';

type Tab = 'summary' | 'bids' | 'wins' | 'lots' | 'sales' | 'purchases';

interface Summary {
  leading: number;
  activeBids: number;
  won: number;
  myLots: number;
  sold: number;
  purchases: number;
}

export function Profile() {
  const { user, token } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'summary';

  const [summary, setSummary] = useState<Summary | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const setTab = (t: Tab) => {
    setParams({ tab: t });
  };

  // Загружаем сводку
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/me/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => {});
  }, [token]);

  // Загружаем данные выбранной вкладки
  useEffect(() => {
    if (!token || tab === 'summary') {
      setData([]);
      return;
    }
    setLoading(true);
    fetch(`${API}/me/${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab, token]);

  if (!user) return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Обзор' },
    { key: 'bids', label: 'Мои ставки' },
    { key: 'wins', label: 'Победы' },
    { key: 'lots', label: 'Мои лоты' },
    { key: 'sales', label: 'Продажи' },
    { key: 'purchases', label: 'Покупки' },
  ];

  return (
    <div className="text-left">
      {/* Заголовок профиля */}
      <div
        className="p-8 mb-8"
        style={{
          backgroundColor: 'var(--site-card)',
          border: '1px solid var(--site-border)',
        }}
      >
        <div className="flex items-center gap-6">
          <div
            className="w-20 h-20 flex items-center justify-center font-serif text-3xl font-bold"
            style={{
              backgroundColor: 'var(--gold-soft)',
              color: 'var(--gold)',
              border: '1.5px solid var(--gold)',
              borderRadius: '50%',
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1
              className="font-serif text-3xl font-bold mb-1"
              style={{ color: 'var(--site-text)' }}
            >
              {user.username}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--site-muted)' }}>
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div
        className="flex gap-1 mb-6 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--site-line)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="px-4 py-3 text-[11px] uppercase font-bold whitespace-nowrap"
            style={{
              letterSpacing: '0.12em',
              color: tab === t.key ? 'var(--site-text)' : 'var(--site-muted)',
              borderBottom:
                tab === t.key
                  ? '2px solid var(--gold)'
                  : '2px solid transparent',
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Контент */}
      {tab === 'summary' && summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryCard
            label="Я лидирую"
            value={summary.leading}
            highlight
          />
          <SummaryCard label="Активных ставок" value={summary.activeBids} />
          <SummaryCard label="Побед" value={summary.won} />
          <SummaryCard label="Моих лотов" value={summary.myLots} />
          <SummaryCard label="Продано" value={summary.sold} />
          <SummaryCard label="Покупок" value={summary.purchases} />
        </div>
      )}

      {loading && (
        <p className="text-sm" style={{ color: 'var(--site-muted)' }}>
          Загрузка...
        </p>
      )}

      {!loading && tab === 'bids' && <BidsTable items={data} />}
      {!loading && tab === 'wins' && <WinsTable items={data} />}
      {!loading && tab === 'lots' && <LotsTable items={data} />}
      {!loading && tab === 'sales' && <SalesTable items={data} />}
      {!loading && tab === 'purchases' && <PurchasesTable items={data} />}

      {!loading && tab !== 'summary' && data.length === 0 && (
        <div className="text-center py-16">
          <p
            className="font-serif text-2xl mb-2"
            style={{ color: 'var(--site-muted)' }}
          >
            Пока пусто
          </p>
          <p className="text-[13px]" style={{ color: 'var(--site-muted)' }}>
            {tab === 'bids' && 'Вы ещё не делали ставок'}
            {tab === 'wins' && 'Побед пока нет'}
            {tab === 'lots' && 'Вы ещё не выставляли лоты'}
            {tab === 'sales' && 'Продаж пока нет'}
            {tab === 'purchases' && 'Покупок пока нет'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Сводка
// ─────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className="p-6"
      style={{
        backgroundColor: highlight ? 'var(--gold-soft)' : 'var(--site-card)',
        border: `1px solid ${
          highlight ? 'var(--gold)' : 'var(--site-border)'
        }`,
      }}
    >
      <p
        className="text-[10px] uppercase font-bold mb-2"
        style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
      >
        {label}
      </p>
      <p
        className="font-serif text-4xl font-bold tabular-nums"
        style={{
          color: highlight ? 'var(--gold)' : 'var(--site-text)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Мои ставки
// ─────────────────────────────────────────────
function BidsTable({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isLeader = item.leader_id === item.my_max_bid;
        const isWinning = item.leader_id && item.leader_id === item.my_max_bid;
        const closed = item.status !== 'active';
        const ended = new Date(item.end_time) < new Date();

        return (
          <Link
            key={item.auction_id}
            to={`/coin/${item.auction_id}`}
            className="flex items-center gap-4 p-4"
            style={{
              backgroundColor: 'var(--site-card)',
              border: '1px solid var(--site-border)',
              textDecoration: 'none',
            }}
          >
            <div
              className="w-16 h-24 overflow-hidden shrink-0"
              style={{ backgroundColor: 'var(--site-bg)' }}
            >
              {item.image_url && (
                <img
                  src={`http://localhost:4000${item.image_url}`}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="font-semibold truncate mb-1"
                style={{ color: 'var(--site-text)' }}
              >
                {item.name}
              </p>
              <p
                className="text-[11px] mb-2"
                style={{ color: 'var(--site-muted)' }}
              >
                {item.year} · {item.metal}
              </p>
              <p
                className="text-[12px] font-semibold"
                style={{ color: 'var(--site-text)' }}
              >
                Текущая: {Number(item.current_top_bid).toLocaleString('ru-RU')} ₽
              </p>
            </div>

            <div className="text-right shrink-0">
              <span
                className="inline-block px-3 py-1.5 text-[10px] uppercase font-bold"
                style={{
                  letterSpacing: '0.12em',
                  backgroundColor:
                    closed || ended
                      ? item.leader_id === item.my_max_bid
                        ? 'var(--gold)'
                        : 'var(--site-muted)'
                      : item.leader_id === item.my_max_bid
                        ? 'var(--tag-accent)'
                        : 'var(--tag-destructive)',
                  color: '#FFF',
                }}
              >
                {closed || ended
                  ? item.leader_id === item.my_max_bid
                    ? 'Победа'
                    : 'Проиграл'
                  : item.leader_id === item.my_max_bid
                    ? 'Лидирую'
                    : 'Перебит'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Победы
// ─────────────────────────────────────────────
function WinsTable({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.order_id || item.id || `purchase-${Math.random()}`}
          to={`/coin/${item.auction_id}`}
          className="flex items-center gap-4 p-4"
          style={{
            backgroundColor: 'var(--site-card)',
            border: '1px solid var(--gold)',
            textDecoration: 'none',
          }}
        >
          <div
            className="w-16 h-24 overflow-hidden shrink-0"
            style={{ backgroundColor: 'var(--site-bg)' }}
          >
            {item.image_url && (
              <img
                src={`http://localhost:4000${item.image_url}`}
                alt={item.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold truncate mb-1"
              style={{ color: 'var(--site-text)' }}
            >
              {item.name}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--site-muted)' }}>
              Завершён: {new Date(item.end_time).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className="font-serif text-xl font-bold tabular-nums"
              style={{ color: 'var(--site-text)' }}
            >
              {Number(item.final_price).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Мои лоты
// ─────────────────────────────────────────────
function LotsTable({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isAuction = item.type === 'auction';
        const closed = item.status !== 'active';

        return (
          <Link
            key={idx}
            to={isAuction ? `/coin/${item.auction_id}` : `/shop/${item.coin_id}`}
            className="flex items-center gap-4 p-4"
            style={{
              backgroundColor: 'var(--site-card)',
              border: '1px solid var(--site-border)',
              textDecoration: 'none',
            }}
          >
            <div
              className="w-16 h-24 overflow-hidden shrink-0"
              style={{ backgroundColor: 'var(--site-bg)' }}
            >
              {item.image_url && (
                <img
                  src={`http://localhost:4000${item.image_url}`}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold truncate mb-1"
                style={{ color: 'var(--site-text)' }}
              >
                {item.name}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--site-muted)' }}>
                {isAuction ? (
                  <>
                    {item.bid_count} ставок
                    {item.leader_username && ` · Лидер: ${item.leader_username}`}
                  </>
                ) : (
                  'Магазин'
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className="font-serif text-xl font-bold tabular-nums mb-1"
                style={{ color: 'var(--site-text)' }}
              >
                {Number(item.current_price).toLocaleString('ru-RU')} ₽
              </p>
              <span
                className="inline-block px-2 py-0.5 text-[9px] uppercase font-bold"
                style={{
                  letterSpacing: '0.12em',
                  backgroundColor:
                    item.status === 'finished' || item.status === 'sold'
                      ? 'var(--site-muted)'
                      : closed
                        ? 'var(--tag-destructive)'
                        : 'var(--gold)',
                  color: '#FFF',
                }}
              >
                {item.status === 'active'
                  ? 'Активен'
                  : item.status === 'finished'
                    ? 'Завершён'
                    : item.status === 'sold'
                      ? 'Продан'
                      : item.status}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Продажи
// ─────────────────────────────────────────────
function SalesTable({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 p-4"
          style={{
            backgroundColor: 'var(--site-card)',
            border: '1px solid var(--site-border)',
          }}
        >
          <div
            className="w-16 h-24 overflow-hidden shrink-0"
            style={{ backgroundColor: 'var(--site-bg)' }}
          >
            {item.image_url && (
              <img
                src={`http://localhost:4000${item.image_url}`}
                alt={item.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold truncate mb-1"
              style={{ color: 'var(--site-text)' }}
            >
              {item.name}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--site-muted)' }}>
              Покупатель: {item.buyer_username || '—'}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--site-muted)' }}>
              {new Date(item.sold_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className="font-serif text-xl font-bold tabular-nums"
              style={{ color: 'var(--gold)' }}
            >
              +{Number(item.price).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Покупки
// ─────────────────────────────────────────────
function PurchasesTable({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.order_id}
          to={`/shop/${item.coin_id}`}
          className="flex items-center gap-4 p-4"
          style={{
            backgroundColor: 'var(--site-card)',
            border: '1px solid var(--site-border)',
            textDecoration: 'none',
          }}
        >
          <div
            className="w-16 h-24 overflow-hidden shrink-0"
            style={{ backgroundColor: 'var(--site-bg)' }}
          >
            {item.image_url && (
              <img
                src={`http://localhost:4000${item.image_url}`}
                alt={item.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold truncate mb-1"
              style={{ color: 'var(--site-text)' }}
            >
              {item.name}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--site-muted)' }}>
              Продавец: {item.seller_username}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--site-muted)' }}>
              {new Date(item.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className="font-serif text-xl font-bold tabular-nums"
              style={{ color: 'var(--site-text)' }}
            >
              {Number(item.price).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}