import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Countdown } from '@/components/Countdown';
import { PriceChart, type PricePoint } from '@/components/PriceChart';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { useAuth } from '@/contexts/AuthContext';
import type { Tag } from '@/types';
import { ImageGallery, type GalleryImage } from '@/components/ImageGallery';
import { ProxyBidForm } from '@/components/ProxyBidForm';

const API = 'http://localhost:4000';

interface Bid {
  id: number;
  amount: string;
  created_at: string;
  username: string;
}

interface AuctionDetail {
  id: number;
  auction_id: number;
  name: string;
  description: string;
  image_url: string | null;
  images: GalleryImage[];
  year: number | null;
  country: string | null;
  metal: string | null;
  weight_g: string | null;
  condition: string | null;
  start_price: string;
  current_price: string;
  bid_step: string;
  end_time: string;
  status: string;
  winner_id: number | null;
  winner_username: string | null;
  tags: Tag[];
  bids: Bid[];
}

export function CoinDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();

  const [data, setData] = useState<AuctionDetail | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidValue, setBidValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [extendedNotice, setExtendedNotice] = useState('');
  const [flash, setFlash] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [auctionRes, historyRes] = await Promise.all([
        fetch(`${API}/api/auctions/${id}`),
        fetch(`${API}/api/auctions/${id}/history`),
      ]);
      if (!auctionRes.ok) throw new Error('Аукцион не найден');
      setData(await auctionRes.json());
      setHistory(await historyRes.json());
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useAuctionSocket(data?.auction_id ?? null, {
    onNewBid: (event) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_price: String(event.amount),
          bids: [
            {
              id: Date.now(),
              amount: String(event.amount),
              username: event.username,
              created_at: event.createdAt,
            },
            ...prev.bids,
          ],
        };
      });
      setHistory((prev) => [
        ...prev,
        { amount: event.amount, time: event.createdAt, username: event.username },
      ]);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    },
    onAuctionClosed: () => {
      setData((prev) => (prev ? { ...prev, status: 'finished' } : prev));
      load();
    },
    onAuctionExtended: (event) => {
      setData((prev) => (prev ? { ...prev, end_time: event.newEndTime } : prev));
      setExtendedNotice(`Аукцион продлён (${event.byUser})`);
      setTimeout(() => setExtendedNotice(''), 5000);
    },
  });

  const placeBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setMsg('Войдите, чтобы делать ставки');
    if (data?.status !== 'active') return;

    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/api/auctions/${id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: Number(bidValue) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMsg('Ставка принята');
      setBidValue('');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm font-semibold" style={{ color: 'var(--site-muted)' }}>
        Загрузка...
      </p>
    );
  }
  if (!data) {
    return (
      <p className="text-sm font-bold" style={{ color: 'var(--tag-destructive)' }}>
        Аукцион не найден
      </p>
    );
  }

  const minBid = Number(data.current_price) + Number(data.bid_step);
  const closed = data.status !== 'active';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 text-left">
      {/* ЛЕВАЯ КОЛОНКА */}
      <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">
        <Link
          to="/"
          className="inline-block text-[11px] uppercase font-bold transition-colors hover:opacity-60"
          style={{ letterSpacing: '0.2em', color: 'var(--site-muted)' }}
        >
          ← К лотам
        </Link>

        {/* Фото в единой витрине */}
<ImageGallery
  images={data.images || []}
  fallbackImage={data.image_url}
  alt={data.name}
/>

        {/* Заголовок и описание */}
        <div>
          <h1
            className="font-serif text-4xl font-bold mb-3 leading-tight"
            style={{ color: 'var(--site-text)' }}
          >
            {data.name}
          </h1>

          {data.description && (
            <p
              className="text-base leading-relaxed mb-6"
              style={{ color: 'var(--site-muted)' }}
            >
              {data.description}
            </p>
          )}

          {/* Характеристики */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {data.year && <Info label="Год" value={String(data.year)} />}
            {data.country && <Info label="Страна" value={data.country} />}
            {data.metal && <Info label="Металл" value={data.metal} />}
            {data.weight_g && <Info label="Вес" value={`${data.weight_g} г`} />}
            {data.condition && <Info label="Сохранность" value={data.condition} />}
          </div>

          {/* Тэги — тонкие линии */}
{data.tags.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {data.tags.map((tag) => (
      <span
        key={tag.id}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase font-bold"
        style={{
          letterSpacing: '0.12em',
          backgroundColor: '#0A0A0A',
          color: '#F2EBDD',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: `var(--tag-${tag.color || 'secondary'})`,
            display: 'inline-block',
          }}
        />
        {tag.label}
      </span>
    ))}
  </div>
)}
        </div>

        {/* График */}
        <PriceChart data={history} startPrice={Number(data.start_price)} />
      </div>

      {/* ПРАВАЯ КОЛОНКА */}
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start order-1 lg:order-2">
        {/* Блок цены */}
        <div
          className="p-6 transition-all duration-500"
          style={{
            backgroundColor: 'var(--site-card)',
            border: `1px solid ${flash ? 'var(--gold)' : 'var(--site-border)'}`,
            boxShadow: flash
              ? '0 24px 60px -20px rgba(156, 115, 38, 0.45)'
              : '0 2px 6px -3px rgba(0, 0, 0, 0.08)',
          }}
        >
          {extendedNotice && (
            <p
              className="text-[11px] uppercase font-bold mb-4 text-center py-2"
              style={{
                letterSpacing: '0.12em',
                backgroundColor: 'var(--gold-soft)',
                color: 'var(--gold)',
              }}
            >
              {extendedNotice}
            </p>
          )}

          <p
            className="text-[10px] uppercase font-bold mb-2"
            style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
          >
            Текущая ставка
          </p>
          <p
            className="font-serif text-5xl font-bold tabular-nums leading-none mb-4"
            style={{ color: 'var(--site-text)' }}
          >
            {Number(data.current_price).toLocaleString('ru-RU')}
            <span className="text-2xl ml-1" style={{ color: 'var(--gold)' }}>₽</span>
          </p>

          <div
            className="flex justify-between text-[12px] font-semibold mb-5 pb-5"
            style={{
              color: 'var(--site-muted)',
              borderBottom: '1px solid var(--site-line)',
            }}
          >
            <span>Старт: {Number(data.start_price).toLocaleString('ru-RU')} ₽</span>
            <span>Шаг: {Number(data.bid_step).toLocaleString('ru-RU')} ₽</span>
          </div>

          <p
            className="text-[10px] uppercase font-bold mb-2"
            style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
          >
            {closed ? 'Статус' : 'До конца'}
          </p>
          <div className="mb-5">
            {closed ? (
              <span
                className="text-xl font-bold"
                style={{ color: 'var(--tag-destructive)' }}
              >
                Завершён
              </span>
            ) : (
              <Countdown endTime={data.end_time} />
            )}
          </div>

          {!closed && user && (
            <form onSubmit={placeBid} className="space-y-3">
              <input
                type="number"
                value={bidValue}
                onChange={(e) => setBidValue(e.target.value)}
                placeholder={`от ${minBid.toLocaleString('ru-RU')}`}
                className="w-full px-4 py-3 text-[15px] font-semibold tabular-nums outline-none"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--site-border)',
                  color: 'var(--site-text)',
                }}
              />
              <button
                type="submit"
                disabled={busy || !bidValue}
                className="w-full py-3.5 text-[11px] uppercase font-bold transition-all disabled:opacity-40 hover:tracking-[0.15em]"
                style={{
                  letterSpacing: '0.12em',
                  backgroundColor: 'var(--site-text)',
                  color: 'var(--site-bg)',
                  cursor: busy || !bidValue ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? '...' : 'Сделать ставку'}
              </button>
            </form>
          )}
          {!closed && user && (
  <ProxyBidForm
    auctionId={data.auction_id}
    currentPrice={Number(data.current_price)}
    bidStep={Number(data.bid_step)}
    onBidPlaced={load}
  />
)}

          {!closed && !user && (
            <Link
              to="/auth"
              className="block text-center text-[11px] uppercase font-bold py-3.5 transition-colors hover:opacity-70"
              style={{
                letterSpacing: '0.12em',
                border: '1px dashed var(--site-border)',
                color: 'var(--site-muted)',
              }}
            >
              Войдите, чтобы делать ставки
            </Link>
          )}

          {/* Победитель */}
          {closed && data.winner_username && (
            <div
              className="mt-5 p-5"
              style={{
                background: 'linear-gradient(135deg, var(--gold-soft), transparent)',
                border: '1px solid var(--gold)',
              }}
            >
              <p
                className="text-[10px] uppercase font-bold mb-2"
                style={{ letterSpacing: '0.2em', color: 'var(--gold)' }}
              >
                🏆 Победитель
              </p>
              <p className="font-serif text-2xl font-bold" style={{ color: 'var(--site-text)' }}>
                {data.winner_username}
              </p>
              <p
                className="font-serif text-lg font-bold tabular-nums mt-1"
                style={{ color: 'var(--gold)' }}
              >
                {Number(data.current_price).toLocaleString('ru-RU')} ₽
              </p>
            </div>
          )}

          {closed && !data.winner_username && (
            <p
              className="mt-5 text-[12px] text-center py-3"
              style={{
                color: 'var(--site-muted)',
                border: '1px dashed var(--site-border)',
              }}
            >
              Аукцион завершён без ставок
            </p>
          )}

          {msg && (
            <p
              className="text-[12px] font-semibold mt-4"
              style={{ color: 'var(--site-text)' }}
            >
              {msg}
            </p>
          )}
        </div>

        {/* История ставок */}
        <div
          className="p-6"
          style={{
            backgroundColor: 'var(--site-card)',
            border: '1px solid var(--site-border)',
          }}
        >
          <h2
            className="text-[11px] uppercase font-bold mb-5"
            style={{ letterSpacing: '0.2em', color: 'var(--site-muted)' }}
          >
            История ставок · {data.bids.length}
          </h2>

          {data.bids.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--site-muted)' }}>
              Ставок пока нет
            </p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {data.bids.map((bid, idx) => (
                <li
                  key={bid.id}
                  className="flex justify-between items-center text-sm py-3 px-3"
                  style={{
                    backgroundColor:
                      idx === 0 ? 'var(--gold-soft)' : 'var(--site-bg)',
                    borderLeft: idx === 0 ? '3px solid var(--gold)' : '3px solid transparent',
                  }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--site-text)' }}>
                      {bid.username}
                    </p>
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--site-muted)' }}
                    >
                      {new Date(bid.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <p
                    className="font-serif text-lg font-bold tabular-nums"
                    style={{ color: 'var(--site-text)' }}
                  >
                    {Number(bid.amount).toLocaleString('ru-RU')} ₽
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-4"
      style={{
        backgroundColor: 'var(--site-card)',
        border: '1px solid var(--site-border)',
      }}
    >
      <p
        className="text-[10px] uppercase font-bold mb-1"
        style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
      >
        {label}
      </p>
      <p className="font-serif text-lg font-bold" style={{ color: 'var(--site-text)' }}>
        {value}
      </p>
    </div>
  );
}