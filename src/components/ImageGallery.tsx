import { useState, useEffect } from 'react';

const API = 'http://localhost:4000';

export interface GalleryImage {
  id: number;
  image_url: string;
  role: string;
  sort_order: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  fallbackImage?: string | null;
  alt: string;
}

const ROLE_LABELS: Record<string, string> = {
  obverse: 'Аверс',
  reverse: 'Реверс',
  edge: 'Гурт',
  macro: 'Макро',
  context: 'Контекст',
  other: 'Фото',
};

export function ImageGallery({ images, fallbackImage, alt }: ImageGalleryProps) {
  const list: GalleryImage[] =
    images.length > 0
      ? images
      : fallbackImage
        ? [{ id: 0, image_url: fallbackImage, role: 'obverse', sort_order: 0 }]
        : [];

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setActiveIdx((i) => (i + 1) % list.length);
      if (e.key === 'ArrowLeft')
        setActiveIdx((i) => (i - 1 + list.length) % list.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, list.length]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [lightboxOpen]);

  if (list.length === 0) {
    return (
      <div
        className="aspect-[2/3] flex items-center justify-center"
        style={{
          backgroundColor: 'var(--site-bg)',
          border: '1px solid var(--site-border)',
        }}
      >
        <span
          className="font-serif text-6xl"
          style={{ color: 'var(--site-border)' }}
        >
          ✦
        </span>
      </div>
    );
  }

  const active = list[activeIdx];
  const hasMultiple = list.length > 1;
  const goPrev = () => setActiveIdx((i) => (i - 1 + list.length) % list.length);
  const goNext = () => setActiveIdx((i) => (i + 1) % list.length);

  return (
    <>
      <div className="space-y-3">
        {/* Главное фото */}
        <div
          className="aspect-[2/3] max-h-[80vh] mx-auto relative cursor-zoom-in group"
          style={{
            backgroundColor: 'var(--site-bg)',
            border: '1px solid var(--site-border)',
          }}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={`${API}${active.image_url}`}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Метка роли */}
          <div
            className="absolute top-4 left-4 px-3 py-1.5 text-[11px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              color: '#000',
            }}
          >
            {ROLE_LABELS[active.role] || 'Фото'}
          </div>

          {/* Счётчик */}
          {hasMultiple && (
            <div
              className="absolute top-4 right-4 px-3 py-1.5 text-[11px] uppercase font-bold tabular-nums"
              style={{
                letterSpacing: '0.12em',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: '#FFF',
              }}
            >
              {activeIdx + 1} / {list.length}
            </div>
          )}

          {/* Подсказка */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 text-[10px] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              letterSpacing: '0.15em',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              color: '#FFF',
            }}
          >
            Нажмите для увеличения
          </div>

          {/* Стрелки */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                →
              </button>
            </>
          )}
        </div>

        {/* Миниатюры */}
        {hasMultiple && (
          <div className="flex gap-2 justify-center flex-wrap">
            {list.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className="relative"
                style={{
                  width: 64,
                  height: 96,
                  border:
                    idx === activeIdx
                      ? '2px solid var(--gold)'
                      : '1px solid var(--site-border)',
                  opacity: idx === activeIdx ? 1 : 0.6,
                  cursor: 'pointer',
                  padding: 0,
                  backgroundColor: 'var(--site-bg)',
                }}
              >
                <img
                  src={`${API}${img.image_url}`}
                  alt={`${alt} ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <span
                  className="absolute bottom-0 left-0 right-0 py-0.5 text-[8px] uppercase font-bold text-center"
                  style={{
                    backgroundColor:
                      idx === activeIdx ? 'var(--gold)' : 'rgba(0,0,0,0.7)',
                    color: idx === activeIdx ? '#000' : '#FFF',
                    letterSpacing: '0.08em',
                  }}
                >
                  {ROLE_LABELS[img.role] || 'Фото'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Лайтбокс */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-2xl font-bold z-10"
            style={{
              color: '#FFF',
              border: '1px solid rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(0,0,0,0.5)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>

          {hasMultiple && (
            <div
              className="absolute top-7 left-1/2 -translate-x-1/2 px-4 py-2 text-[11px] uppercase font-bold tabular-nums"
              style={{ letterSpacing: '0.15em', color: '#FFF' }}
            >
              {activeIdx + 1} / {list.length}
            </div>
          )}

          <img
            src={`${API}${active.image_url}`}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 text-[11px] uppercase font-bold"
            style={{
              letterSpacing: '0.15em',
              color: '#FFF',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            {ROLE_LABELS[active.role] || 'Фото'}
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center text-2xl font-bold"
                style={{
                  color: '#FFF',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center text-2xl font-bold"
                style={{
                  color: '#FFF',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                }}
              >
                →
              </button>
            </>
          )}

          <div
            className="absolute bottom-3 right-6 text-[10px] uppercase font-bold"
            style={{ letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}
          >
            ← → · Esc
          </div>
        </div>
      )}
    </>
  );
}