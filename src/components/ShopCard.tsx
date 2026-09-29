import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReveal } from '@/hooks/useReveal';

const API = 'http://localhost:4000';

interface ShopItem {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  year: number | null;
  metal: string | null;
  condition: string | null;
  fixed_price: string;
  in_stock: boolean;
  tags: Array<{ id: number; label: string; color: string }>;
}

export function ShopCard({ item }: { item: ShopItem }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { ref, visible } = useReveal();

  const buy = async () => {
    if (!token) {
      navigate('/auth');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/api/shop/${item.id}/buy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('Куплено! Свяжитесь с продавцом.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      ref={ref}
      className={`card-hover reveal text-left overflow-hidden flex flex-col ${
        visible ? 'visible' : ''
      }`}
      style={{
        backgroundColor: 'var(--site-card)',
        border: '1px solid var(--site-border)',
        boxShadow: '0 2px 6px -3px rgba(0, 0, 0, 0.08)',
        opacity: item.in_stock ? 1 : 0.6,
      }}
    >
      <Link to={`/shop/${item.id}`} className="block relative">
        <div className="photo-frame aspect-[2/3]">
          {item.image_url ? (
            <img src={`${API}${item.image_url}`} alt={item.name} />
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

        {!item.in_stock && (
          <div
            className="absolute top-4 right-4 px-3 py-1.5 text-[11px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              backgroundColor: '#0A0A0A',
              color: '#F2EBDD',
            }}
          >
            Продано
          </div>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <Link to={`/shop/${item.id}`} className="block">
          <h3 className="text-lg font-bold mb-1 leading-tight">
            {item.name}
          </h3>
        </Link>

        <p
          className="text-xs font-semibold mb-3"
          style={{ color: 'var(--site-muted)' }}
        >
          {item.year} · {item.metal} · {item.condition}
        </p>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.map((tag) => (
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

        <div
          className="flex justify-between items-end pt-3 mb-4 mt-auto"
          style={{ borderTop: '1px solid var(--site-line)' }}
        >
          <div>
            <p
              className="text-[10px] uppercase font-bold mb-1"
              style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
            >
              Цена
            </p>
            <p
              className="font-serif text-2xl font-bold tabular-nums leading-none"
              style={{ color: 'var(--site-text)' }}
            >
              {Number(item.fixed_price).toLocaleString('ru-RU')}
              <span className="text-base ml-1" style={{ color: 'var(--gold)' }}>
                ₽
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={buy}
          disabled={busy || !item.in_stock}
          className="w-full py-3 text-[11px] uppercase font-bold disabled:opacity-40"
          style={{
            letterSpacing: '0.12em',
            backgroundColor: item.in_stock
              ? 'var(--site-text)'
              : 'var(--site-muted)',
            color: 'var(--site-bg)',
            cursor: busy || !item.in_stock ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '...' : item.in_stock ? 'Купить' : 'Продано'}
        </button>

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