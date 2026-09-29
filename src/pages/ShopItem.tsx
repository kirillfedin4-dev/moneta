import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ImageGallery, type GalleryImage } from '@/components/ImageGallery';   // ← только ОДНА строка
import { useAuth } from '@/contexts/AuthContext';
import type { Tag } from '@/types';

const API = 'http://localhost:4000';

interface ShopItemFull {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  images: GalleryImage[]; 
  year: number | null;
  country: string | null;
  metal: string | null;
  weight_g: string | null;
  condition: string | null;
  fixed_price: string;
  in_stock: boolean;
  tags: Tag[];
}

interface ShopImage {
  id: number;
  image_url: string;
  role: string;
  sort_order: number;
}

export function ShopItem() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<ShopItemFull | null>(null);
  const [images, setImages] = useState<ShopImage[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/shop/${id}`).then((r) => {
        if (!r.ok) throw new Error('Товар не найден');
        return r.json();
      }),
      fetch(`${API}/api/coins/${id}/images`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([itemData, imagesData]) => {
        setItem(itemData);
        setImages(imagesData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const buy = async () => {
    if (!token) {
      navigate('/auth');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/api/shop/${id}/buy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('Покупка оформлена! Свяжитесь с продавцом.');
      setItem((prev) => (prev ? { ...prev, in_stock: false } : prev));
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <p className="text-sm font-semibold" style={{ color: 'var(--site-muted)' }}>
        Загрузка...
      </p>
    );

  if (error || !item)
    return (
      <div className="text-center py-16">
        <p
          className="font-serif text-3xl mb-4"
          style={{ color: 'var(--site-text)' }}
        >
          Товар не найден
        </p>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 text-[11px] uppercase font-bold"
          style={{
            letterSpacing: '0.12em',
            backgroundColor: 'var(--site-text)',
            color: 'var(--site-bg)',
          }}
        >
          В магазин
        </Link>
      </div>
    );

  const list = images.length > 0
    ? images
    : item.image_url
      ? [{ id: 0, image_url: item.image_url, role: 'obverse', sort_order: 0 }]
      : [];

  const activeImg = list[activeImage];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 text-left">
      {/* ЛЕВАЯ: фото */}
      <div className="lg:col-span-2 space-y-6">
        <Link
          to="/shop"
          className="inline-block text-[11px] uppercase font-bold hover:opacity-60"
          style={{ letterSpacing: '0.2em', color: 'var(--site-muted)' }}
        >
          ← В магазин
        </Link>

<ImageGallery
  images={item.images || []}
  fallbackImage={item.image_url}
  alt={item.name}
/>

        {/* Описание */}
        <div>
          <h1
            className="font-serif text-4xl font-bold mb-3"
            style={{ color: 'var(--site-text)' }}
          >
            {item.name}
          </h1>

          {item.description && (
            <p
              className="text-base leading-relaxed mb-6"
              style={{ color: 'var(--site-muted)' }}
            >
              {item.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {item.year && <Info label="Год" value={String(item.year)} />}
            {item.country && <Info label="Страна" value={item.country} />}
            {item.metal && <Info label="Металл" value={item.metal} />}
            {item.weight_g && <Info label="Вес" value={`${item.weight_g} г`} />}
            {item.condition && (
              <Info label="Сохранность" value={item.condition} />
            )}
          </div>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 text-[11px] uppercase font-bold"
                  style={{
                    letterSpacing: '0.12em',
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
      </div>

      {/* ПРАВАЯ: цена и покупка */}
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div
          className="p-6"
          style={{
            backgroundColor: 'var(--site-card)',
            border: '1px solid var(--site-border)',
          }}
        >
          <p
            className="text-[10px] uppercase font-bold mb-2"
            style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
          >
            Цена
          </p>
          <p
            className="font-serif text-5xl font-bold tabular-nums leading-none mb-5"
            style={{ color: 'var(--site-text)' }}
          >
            {Number(item.fixed_price).toLocaleString('ru-RU')}
            <span className="text-2xl ml-1" style={{ color: 'var(--gold)' }}>
              ₽
            </span>
          </p>

          <div
            className="flex justify-between text-[12px] font-semibold mb-5 pb-5"
            style={{
              color: 'var(--site-muted)',
              borderBottom: '1px solid var(--site-line)',
            }}
          >
            <span>Доставка</span>
            <span>по договорённости</span>
          </div>

          {item.in_stock ? (
            <button
              type="button"
              onClick={buy}
              disabled={busy}
              className="w-full py-4 text-[12px] uppercase font-bold disabled:opacity-40"
              style={{
                letterSpacing: '0.15em',
                backgroundColor: 'var(--site-text)',
                color: 'var(--site-bg)',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? '...' : user ? 'Купить' : 'Войти и купить'}
            </button>
          ) : (
            <div
              className="text-center py-4"
              style={{
                backgroundColor: 'var(--site-bg)',
                color: 'var(--site-muted)',
                border: '1px dashed var(--site-border)',
              }}
            >
              <p className="text-[12px] uppercase font-bold" style={{ letterSpacing: '0.15em' }}>
                Продано
              </p>
            </div>
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

        <div
          className="p-6"
          style={{
            backgroundColor: 'var(--site-card)',
            border: '1px solid var(--site-border)',
          }}
        >
          <p
            className="text-[10px] uppercase font-bold mb-3"
            style={{ letterSpacing: '0.2em', color: 'var(--site-muted)' }}
          >
            Как купить
          </p>
          <ol
            className="text-[13px] space-y-2 leading-relaxed"
            style={{ color: 'var(--site-muted)' }}
          >
            <li>1. Нажмите «Купить»</li>
            <li>2. Мы свяжемся с вами</li>
            <li>3. Оплата и доставка</li>
          </ol>
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
      <p
        className="font-serif text-lg font-bold"
        style={{ color: 'var(--site-text)' }}
      >
        {value}
      </p>
    </div>
  );
}