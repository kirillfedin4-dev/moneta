import { useEffect, useState } from 'react';
import { ShopCard } from '@/components/ShopCard';
import type { Tag } from '@/types';

const API = 'http://localhost:4000/api';

interface ShopItem {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  year: number | null;
  country: string | null;
  metal: string | null;
  weight_g: string | null;
  condition: string | null;
  fixed_price: string;
  in_stock: boolean;
  tags: Tag[];
}

export function Shop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/shop`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="mb-16 text-center max-w-3xl mx-auto">
        <p
          className="text-[11px] uppercase font-bold mb-5"
          style={{
            letterSpacing: '0.25em',
            color: 'var(--gold)',
            animation: 'fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards',
            opacity: 0,
          }}
        >
          Магазин
        </p>

        <h1
          className="font-serif text-5xl sm:text-6xl font-bold mb-6 leading-[1.08]"
          style={{
            color: 'var(--site-text)',
            animation: 'fadeInUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards',
            opacity: 0,
          }}
        >
          Монеты в наличии
        </h1>

        <div
          className="mx-auto mb-6"
          style={{
            width: 0,
            height: 1,
            backgroundColor: 'var(--gold)',
            animation: 'lineGrow 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards',
          }}
        />

        <p
          className="text-lg font-medium leading-relaxed"
          style={{
            color: 'var(--site-muted)',
            animation: 'fadeInUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.75s forwards',
            opacity: 0,
          }}
        >
          Готовые к покупке монеты с фиксированной ценой.
          Доставка в любой регион.
        </p>
      </section>

      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2
            className="font-serif text-4xl font-bold mb-3"
            style={{ color: 'var(--site-text)' }}
          >
            В продаже
          </h2>
          <p
            className="text-[12px] uppercase font-bold"
            style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
          >
            {items.length} {items.length === 1 ? 'монета' : 'монет'}
          </p>
        </div>
        <div
          className="hidden sm:block h-px flex-1 ml-8"
          style={{ backgroundColor: 'var(--site-line)' }}
        />
      </div>

      {loading && (
        <p className="text-sm font-semibold" style={{ color: 'var(--site-muted)' }}>
          Загрузка...
        </p>
      )}
      {error && (
        <p className="text-sm font-bold" style={{ color: 'var(--tag-destructive)' }}>
          Ошибка: {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p
          className="text-center py-16 font-serif text-2xl italic"
          style={{ color: 'var(--site-muted)' }}
        >
          Пока нет товаров в наличии
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <ShopCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}