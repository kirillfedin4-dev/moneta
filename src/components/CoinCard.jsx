import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SplitText from './SplitText';
import { Countdown } from './Countdown';
import { ProxyBidForm } from './ProxyBidForm';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { useReveal } from '@/hooks/useReveal';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://localhost:4000';

export function CoinCard({ coin, onBidPlaced }) {
  const { token, user } = useAuth();
  const [bidValue, setBidValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [currentPrice, setCurrentPrice] = useState(Number(coin.current_price));
  const [lastBidder, setLastBidder] = useState('');
  const [flash, setFlash] = useState(false);
  const [closed, setClosed] = useState(coin.status !== 'active');
  const [endTime, setEndTime] = useState(coin.end_time);
  const [extendedNotice, setExtendedNotice] = useState('');
  const [priceKey, setPriceKey] = useState(0);

  const { ref, visible } = useReveal();

  useAuctionSocket(coin.auction_id, {
    onNewBid: (event) => {
      setCurrentPrice(event.amount);
      setLastBidder(event.username);
      setFlash(true);
      setPriceKey((k) => k + 1);
      setTimeout(() => setFlash(false), 1200);
    },
    onAuctionClosed: () => setClosed(true),
    onAuctionExtended: (event) => {
      setEndTime(event.newEndTime);
      setExtendedNotice(`Продлён на 2 мин (${event.byUser})`);
      setTimeout(() => setExtendedNotice(''), 4000);
    },
  });

  useEffect(() => {
    setCurrentPrice(Number(coin.current_price));
    setClosed(coin.status !== 'active');
    setEndTime(coin.end_time);
  }, [coin.current_price, coin.status, coin.end_time]);

  const minBid = currentPrice + Number(coin.bid_step);

  const placeBid = async (e) => {
    e.preventDefault();
    if (!token) return setMsg('Войдите, чтобы делать ставки');
    if (closed) return;

    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(
        `${API}/api/auctions/${coin.auction_id}/bids`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: Number(bidValue) }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('Ставка принята');
      setBidValue('');
      onBidPlaced?.();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      ref={ref}
      className={`card-hover reveal text-left  overflow-hidden flex flex-col ${
        visible ? 'visible' : ''
      }`}
      style={{
        backgroundColor: 'var(--site-card)',
        border: `1px solid ${
          flash ? 'var(--gold)' : 'var(--site-border)'
        }`,
        boxShadow: flash
          ? '0 24px 60px -20px rgba(156, 115, 38, 0.45)'
          : '0 2px 6px -3px rgba(0, 0, 0, 0.08)',
        opacity: closed ? 0.75 : 1,
      }}
    >
      {/* Фото */}
      <Link to={`/coin/${coin.auction_id}`} className="block relative group">
        <div className="photo-frame aspect-[2/3]">
          {coin.image_url ? (
            <img src={`${API}${coin.image_url}`} alt={coin.name} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="font-serif text-5xl"
                style={{ color: 'var(--site-border)' }}
              >
                ✦
              </span>
            </div>
          )}
        </div>

        {coin.tags[0] && (
          <div
            className="absolute top-4 left-4 px-3 py-1.5 text-[11px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.15)',
              color: '#000',
            }}
          >
            {coin.tags[0].label}
          </div>
        )}

        {closed && (
          <div
            className="absolute top-4 right-4 px-3 py-1.5 text-[11px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              backgroundColor: '#0A0A0A',
              color: '#F2EBDD',
            }}
          >
            Завершён
          </div>
        )}
      </Link>

      {/* Информация */}
      <div className="p-5 flex flex-col flex-1">
        <Link to={`/coin/${coin.auction_id}`} className="block">
          <SplitText
            text={coin.name}
            delay={30}
            duration={0.5}
            className="text-lg font-bold mb-1 leading-tight"
            tag="h3"
          />
        </Link>

        <p
          className="text-xs font-semibold mb-3"
          style={{ color: 'var(--site-muted)' }}
        >
          {coin.year} · {coin.metal} · {coin.condition}
        </p>

        {coin.description && (
          <p
            className="text-[13px] mb-4 line-clamp-2"
            style={{ color: 'var(--site-muted)' }}
          >
            {coin.description}
          </p>
        )}

        {coin.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
{coin.tags.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mb-4">
    {coin.tags.map((tag) => (
      <span
        key={tag.id}
        className="px-2.5 py-1 text-[10px] uppercase font-bold"
        style={{
          letterSpacing: '0.1em',
          backgroundColor: '#0A0A0A',
          color: '#F2EBDD',
        }}
      >
        {tag.label}
      </span>
    ))}
  </div>
)}
          </div>
        )}

        {/* Цена и таймер */}
        <div
          className="flex justify-between items-end pt-3 mb-4 mt-auto gap-3"
          style={{ borderTop: '1px solid var(--site-line)' }}
        >
          <div>
            <p
              className="text-[10px] uppercase font-bold mb-1"
              style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
            >
              Текущая ставка
            </p>
            <p
              key={priceKey}
              className="price-flip font-serif text-2xl font-bold tabular-nums leading-none"
              style={{ color: 'var(--site-text)' }}
            >
              {currentPrice.toLocaleString('ru-RU')}
              <span className="text-base ml-1" style={{ color: 'var(--gold)' }}>
                ₽
              </span>
            </p>
            {lastBidder && (
              <p
                className="text-[11px] font-bold mt-1.5"
                style={{ color: 'var(--gold)' }}
              >
                ◆ {lastBidder}
              </p>
            )}
          </div>
          <div className="text-right">
            <p
              className="text-[10px] uppercase font-bold mb-1"
              style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
            >
              {closed ? 'Статус' : 'До конца'}
            </p>
            {closed ? (
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--site-muted)' }}
              >
                —
              </span>
            ) : (
              <Countdown endTime={endTime} onExpired={() => setClosed(true)} />
            )}
          </div>
        </div>

        {extendedNotice && (
          <p
            className="text-[10px] uppercase font-bold mb-3 text-center py-1.5"
            style={{
              letterSpacing: '0.12em',
              backgroundColor: 'var(--gold-soft)',
              color: 'var(--gold)',
            }}
          >
            {extendedNotice}
          </p>
        )}

        {!closed && user && (
          <form onSubmit={placeBid} className="flex gap-2">
            <input
              type="number"
              value={bidValue}
              onChange={(e) => setBidValue(e.target.value)}
              placeholder={`от ${minBid.toLocaleString('ru-RU')}`}
              className="flex-1 min-w-0 px-3 py-3 text-[15px] font-semibold tabular-nums outline-none"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
              }}
            />
            <button
              type="submit"
              disabled={busy || !bidValue}
              className="px-5 py-3 text-[11px] uppercase font-bold disabled:opacity-40"
              style={{
                letterSpacing: '0.12em',
                backgroundColor: 'var(--site-text)',
                color: 'var(--site-bg)',
                cursor: busy || !bidValue ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? '...' : 'Ставка'}
            </button>
          </form>
        )}

        {!closed && !user && (
          <Link
            to="/auth"
            className="block text-center text-[11px] uppercase font-bold py-3.5"
            style={{
              letterSpacing: '0.12em',
              border: '1px dashed var(--site-border)',
              color: 'var(--site-muted)',
            }}
          >
            Войдите, чтобы делать ставки
          </Link>
        )}

        {!closed && user && (
          <ProxyBidForm
            auctionId={coin.auction_id}
            currentPrice={currentPrice}
            bidStep={Number(coin.bid_step)}
            onBidPlaced={onBidPlaced}
          />
        )}

        {msg && (
          <p
            className="text-[12px] font-semibold mt-3"
            style={{ color: 'var(--site-text)' }}
          >
            {msg}
          </p>
        )}
      </div>
    </article>
  );
}