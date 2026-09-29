import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface ImageCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onApply: (croppedBlob: Blob) => void;
  queueInfo?: { current: number; total: number };
}

export function ImageCropper({
  imageSrc,
  onCancel,
  onApply,
  queueInfo,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Сброс кадра при смене изображения (важно для очереди)
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageSrc]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const applyCrop = async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);

    try {
      const image = await loadImage(imageSrc);
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (blob) onApply(blob);
          setBusy(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (e) {
      console.error('Crop error', e);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div
        className="w-full max-w-3xl"
        style={{
          backgroundColor: 'var(--site-card)',
          border: '1px solid var(--site-border)',
        }}
      >
        <div
          className="p-5 flex justify-between items-start"
          style={{ borderBottom: '1px solid var(--site-line)' }}
        >
          <div>
            <p
              className="text-[11px] uppercase font-bold"
              style={{ letterSpacing: '0.2em', color: 'var(--gold)' }}
            >
              Кадрирование
              {queueInfo && ` · ${queueInfo.current} из ${queueInfo.total}`}
            </p>
            <h3
              className="font-serif text-2xl font-bold mt-1"
              style={{ color: 'var(--site-text)' }}
            >
              Настройте кадр
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-60"
            style={{
              color: 'var(--site-muted)',
              border: '1px solid var(--site-border)',
            }}
            aria-label="Отменить"
          >
            ×
          </button>
        </div>

        <div
          className="relative"
          style={{
            height: '60vh',
            maxHeight: 480,
            minHeight: 300,
            backgroundColor: '#000',
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={2 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
          />
        </div>

        <div className="p-5 space-y-4">
          <label
            className="text-[10px] uppercase font-bold mb-2 block"
            style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
          >
            Масштаб
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="slider w-full"
          />

          <p
            className="text-[12px] font-medium italic"
            style={{ color: 'var(--site-muted)' }}
          >
            Совет: поместите монету в центр кадра. Соотношение 2:3 — как на
            витрине аукциона.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-6 py-3 text-[11px] uppercase font-bold transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{
                letterSpacing: '0.12em',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
              }}
            >
              Отменить всё
            </button>
            <button
              type="button"
              onClick={applyCrop}
              disabled={busy}
              className="px-8 py-3 text-[11px] uppercase font-bold transition-all hover:tracking-[0.15em] disabled:opacity-40"
              style={{
                letterSpacing: '0.12em',
                backgroundColor: 'var(--site-text)',
                color: 'var(--site-bg)',
              }}
            >
              {busy ? 'Обработка...' : 'Применить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}