import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import {
  ImageQualityHint,
  evaluateQuality,
} from '@/components/ImageQualityHint';
import { useAuth } from '@/contexts/AuthContext';
import type { Tag } from '@/types';
import { TagsSelector } from '@/components/TagsSelector';

const API = 'http://localhost:4000/api';

interface GalleryItem {
  id: string;
  url: string;
  role: string;
  quality?: { sharpness: number; brightness: number };
}

interface FormState {
  name: string;
  description: string;
  images: GalleryItem[];
  year: string;
  country: string;
  metal: string;
  weight_g: string;
  condition: string;
  start_price: string;
  bid_step: string;
  duration_days: string;
  fixed_price: string;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  images: [],
  year: '',
  country: '',
  metal: '',
  weight_g: '',
  condition: '',
  start_price: '',
  bid_step: '100',
  duration_days: '3',
  fixed_price: '',
};

const ROLE_OPTIONS = [
  { value: 'obverse', label: 'Аверс' },
  { value: 'reverse', label: 'Реверс' },
  { value: 'edge', label: 'Гурт' },
  { value: 'macro', label: 'Макро' },
  { value: 'context', label: 'Контекст' },
  { value: 'other', label: 'Другое' },
];

export function CreateCoin() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [listingType, setListingType] = useState<'auction' | 'shop'>('auction');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API}/tags`)
      .then((r) => r.json())
      .then(setTags)
      .catch(() => setMessage('Не удалось загрузить тэги'));
  }, []);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const removeImage = (id: string) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id),
    }));
  };

  const changeRole = (id: string, role: string) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === id ? { ...img, role } : img
      ),
    }));
  };

  const badImages = form.images.filter(
    (img) =>
      img.quality &&
      evaluateQuality(img.quality.sharpness, img.quality.brightness).level ===
        'error'
  );
  const hasBadImages = badImages.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setMessage('Войдите, чтобы создавать монеты');
    if (form.images.length === 0)
      return setMessage('Загрузите хотя бы одно фото');
    if (hasBadImages)
      return setMessage(
        `${badImages.length} фото не прошли проверку. Замените их.`
      );

    if (listingType === 'shop' && !form.fixed_price) {
      return setMessage('Укажите цену для магазина');
    }

    setSaving(true);
    setMessage('');

    try {
      const mainImage = form.images[0].url;

      const res = await fetch(`${API}/coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          image_url: mainImage,
          year: form.year,
          country: form.country,
          metal: form.metal,
          weight_g: form.weight_g,
          condition: form.condition,
          start_price: form.start_price,
          bid_step: form.bid_step,
          duration_days: form.duration_days,
          fixed_price: form.fixed_price,
          listing_type: listingType,
          tag_ids: selectedTagIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось создать');

      const coinId = data.coinId;

      if (listingType === 'auction') {
        for (let i = 1; i < form.images.length; i++) {
          const img = form.images[i];
          await fetch(`${API}/coins/${coinId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ image_url: img.url, role: img.role }),
          });
        }
      }

      setMessage('Монета добавлена!');
      setForm(emptyForm);
      setSelectedTagIds([]);

      if (listingType === 'shop') {
        navigate('/shop');
      } else if (data.auctionId) {
        navigate(`/coin/${data.auctionId}`);
      }
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: 'var(--site-muted)',
    marginBottom: 6,
    display: 'block',
  };

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--site-border)',
    color: 'var(--site-text)',
  };

  const lastImage = form.images[form.images.length - 1];

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto space-y-6 text-left px-0 sm:px-2"
    >
      <div>
        <h2
          className="font-serif text-4xl font-bold mb-2"
          style={{ color: 'var(--site-text)' }}
        >
          Добавить лот
        </h2>
        <p className="text-sm font-medium" style={{ color: 'var(--site-muted)' }}>
          Выберите тип размещения и заполните карточку
        </p>
      </div>

      {/* Тип размещения */}
      <div>
        <label style={labelStyle}>Тип размещения</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setListingType('auction')}
            className="flex-1 py-3 text-[11px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              backgroundColor:
                listingType === 'auction' ? '#0A0A0A' : 'transparent',
              color:
                listingType === 'auction' ? '#F2EBDD' : 'var(--site-muted)',
              border: '1px solid var(--site-border)',
              cursor: 'pointer',
            }}
          >
            Аукцион
          </button>
          <button
            type="button"
            onClick={() => setListingType('shop')}
            className="flex-1 py-3 text-[11px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              backgroundColor:
                listingType === 'shop' ? '#0A0A0A' : 'transparent',
              color: listingType === 'shop' ? '#F2EBDD' : 'var(--site-muted)',
              border: '1px solid var(--site-border)',
              cursor: 'pointer',
            }}
          >
            Магазин
          </button>
        </div>
      </div>

      {/* Галерея */}
      <div>
        <label style={labelStyle}>Фото монеты ({form.images.length})</label>

{form.images.length > 0 && (
  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-4">
    {form.images.map((img, idx) => {
      const isBad =
        img.quality &&
        evaluateQuality(img.quality.sharpness, img.quality.brightness)
          .level === 'error';

      return (
        <div
          key={img.id}
          style={{
            border: `2px solid ${
              isBad ? 'var(--tag-destructive)' : 'var(--site-border)'
            }`,
            backgroundColor: 'var(--site-card)',
          }}
        >
          <div className="aspect-[2/3] overflow-hidden">
            <img
              src={`http://localhost:4000${img.url}`}
              alt={`Фото ${idx + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          <select
            value={img.role}
            onChange={(e) => changeRole(img.id, e.target.value)}
            className="w-full text-[10px] uppercase font-bold p-2"
            style={{
              border: 'none',
              borderTop: '1px solid var(--site-border)',
              backgroundColor: 'var(--site-card)',
              color: 'var(--site-text)',
              letterSpacing: '0.1em',
            }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Кнопка удаления — БЕЛАЯ с красным текстом, хорошо видна */}
          <button
            type="button"
            onClick={() => removeImage(img.id)}
            className="w-full py-2.5 text-[10px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              borderTop: '1px solid var(--site-border)',
              backgroundColor: '#FFFFFF',
              color: 'var(--tag-destructive)',
              cursor: 'pointer',
              transition: 'background-color 200ms ease, color 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--tag-destructive)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = 'var(--tag-destructive)';
            }}
          >
            Удалить фото
          </button>

          {/* Бейдж "Плохое" — снизу, на светлом фоне */}
          {isBad && (
            <div
              className="text-[9px] uppercase font-bold px-2 py-1.5 text-center"
              style={{
                backgroundColor: 'var(--tag-destructive)',
                color: '#FFFFFF',
                letterSpacing: '0.1em',
              }}
            >
              Плохое качество
            </div>
          )}
        </div>
      );
    })}
  </div>
)}

        {lastImage?.quality && (
          <ImageQualityHint
            sharpness={lastImage.quality.sharpness}
            brightness={lastImage.quality.brightness}
          />
        )}

        <div className="mt-4">
          <ImageUpload
            value={null}
            onChange={(url) => {
              if (!url) return;
              const nextRole =
                form.images.length === 0
                  ? 'obverse'
                  : form.images.length === 1
                    ? 'reverse'
                    : 'other';
              setForm((prev) => ({
                ...prev,
                images: [
                  ...prev.images,
                  {
                    id: `${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,
                    url,
                    role: nextRole,
                  },
                ],
              }));
            }}
            onQuality={(q) => {
              setForm((prev) => {
                if (prev.images.length === 0) return prev;
                const newImages = [...prev.images];
                const lastIdx = newImages.length - 1;
                newImages[lastIdx] = { ...newImages[lastIdx], quality: q };
                return { ...prev, images: newImages };
              });
            }}
          />
        </div>
      </div>

      {/* Название */}
      <div>
        <label htmlFor="name" style={labelStyle}>
          Название *
        </label>
        <Input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Николай II. 10 рублей 1899"
          required
          style={inputStyle}
        />
      </div>

      {/* Описание */}
      <div>
        <label htmlFor="description" style={labelStyle}>
          Описание
        </label>
        <Textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Состояние, особенности, история монеты..."
          style={inputStyle}
        />
      </div>

      {/* Характеристики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Год</label>
          <Input name="year" type="number" value={form.year} onChange={handleChange} placeholder="1899" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Страна</label>
          <Input name="country" value={form.country} onChange={handleChange} placeholder="Российская империя" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Металл</label>
          <Input name="metal" value={form.metal} onChange={handleChange} placeholder="Золото / Серебро" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Вес (г)</label>
          <Input name="weight_g" type="number" step="0.01" value={form.weight_g} onChange={handleChange} placeholder="8.60" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Сохранность</label>
          <Input name="condition" value={form.condition} onChange={handleChange} placeholder="UNC / XF / VF" style={inputStyle} />
        </div>
      </div>

      {/* Цены */}
      {listingType === 'auction' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Стартовая цена (₽) *</label>
            <Input name="start_price" type="number" value={form.start_price} onChange={handleChange} placeholder="70000" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Шаг ставки (₽)</label>
            <Input name="bid_step" type="number" value={form.bid_step} onChange={handleChange} placeholder="1000" style={inputStyle} />
          </div>
          <div className="sm:col-span-2">
            <label style={labelStyle}>Длительность (дней)</label>
            <Input name="duration_days" type="number" value={form.duration_days} onChange={handleChange} placeholder="3" style={inputStyle} />
          </div>
        </div>
      ) : (
        <div>
          <label style={labelStyle}>Цена (₽) *</label>
          <Input name="fixed_price" type="number" value={form.fixed_price} onChange={handleChange} placeholder="85000" required style={inputStyle} />
        </div>
      )}

      {/* Тэги */}
<div>
  <label style={labelStyle}>Тэги</label>
  <p
    className="text-[11px] mb-3"
    style={{ color: 'var(--site-muted)' }}
  >
    Чем больше правильных тэгов — тем быстрее покупатели найдут лот.
    Не бойтесь добавлять и номинал, и металл, и правителя.
  </p>
  <TagsSelector
    selectedTagIds={selectedTagIds}
    onToggle={toggleTag}
  />
</div>

      {hasBadImages && (
        <div
          className="px-4 py-3"
          style={{
            backgroundColor: 'rgba(255, 10, 35, 0.08)',
            borderLeft: '3px solid var(--tag-destructive)',
          }}
        >
          <p className="text-[12px] font-bold" style={{ color: '#000' }}>
            {badImages.length}{' '}
            {badImages.length === 1 ? 'фото не прошло' : 'фото не прошли'}{' '}
            проверку качества. Удалите и загрузите заново.
          </p>
        </div>
      )}

      <div className="flex items-center gap-5 pt-2">
        <button
          type="submit"
          disabled={saving || hasBadImages}
          className="px-8 py-3.5 text-[11px] uppercase font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            letterSpacing: '0.12em',
            backgroundColor: hasBadImages
              ? 'var(--site-muted)'
              : 'var(--site-text)',
            color: 'var(--site-bg)',
            cursor: saving || hasBadImages ? 'not-allowed' : 'pointer',
          }}
        >
          {saving
            ? 'Сохранение...'
            : hasBadImages
              ? 'Исправьте фото'
              : listingType === 'shop'
                ? 'Добавить в магазин'
                : 'Создать лот'}
        </button>

        {message && (
          <p
            className="text-[12px] font-bold px-3 py-2"
            style={{
              backgroundColor: message.startsWith('Не')
                ? 'var(--tag-destructive)'
                : 'var(--gold-soft)',
              color: message.startsWith('Не') ? '#000' : 'var(--gold)',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}