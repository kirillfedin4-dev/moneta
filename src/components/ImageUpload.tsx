import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ImageCropper } from './ImageCropper';
import { estimateSharpness, estimateBrightness } from '@/utils/imageQuality';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onQuality?: (q: { sharpness: number; brightness: number }) => void;
}

const API = 'http://localhost:4000';

export function ImageUpload({ onChange, onQuality }: ImageUploadProps) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Очередь на кроп: массив dataURL-ов
  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [cropIndex, setCropIndex] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const pickFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid: File[] = [];

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`Файл ${file.name} больше 10 МБ — пропущен`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        setError(`Файл ${file.name} — не изображение, пропущен`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) return;

    setError('');
    setUploadedCount(0);

    // Читаем все файлы в dataURL
    Promise.all(
      valid.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((urls) => {
      setCropQueue(urls);
      setCropIndex(0);
    });
  };

  const handleCropApply = async (blob: Blob) => {
    if (!token) return setError('Войдите, чтобы загружать фото');

    setUploading(true);
    setError('');

    try {
      // 1. Проверка качества
      const previewUrl = URL.createObjectURL(blob);
      const [sharp, bright] = await Promise.all([
        estimateSharpness(previewUrl),
        estimateBrightness(previewUrl),
      ]);
      URL.revokeObjectURL(previewUrl);

      // 2. Загрузка на сервер
      const formData = new FormData();
      formData.append('image', blob, `coin-${cropIndex + 1}.jpg`);

      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 3. Отдаём наверх
      onChange(data.url);
      onQuality?.({ sharpness: sharp, brightness: bright });

      setUploadedCount((c) => c + 1);

      // 4. Переход к следующему фото в очереди
      if (cropIndex + 1 < cropQueue.length) {
        setCropIndex((i) => i + 1);
      } else {
        // Очередь закончилась
        setCropQueue([]);
        setCropIndex(0);
      }
    } catch (e: any) {
      console.error('[ImageUpload] Ошибка:', e);
      setError(e.message || 'Не удалось обработать фото');

      // Пропускаем плохое фото и идём дальше
      if (cropIndex + 1 < cropQueue.length) {
        setCropIndex((i) => i + 1);
      } else {
        setCropQueue([]);
        setCropIndex(0);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) pickFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) pickFiles(e.dataTransfer.files);
  };

  const cancelQueue = () => {
    setCropQueue([]);
    setCropIndex(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer p-8 sm:p-10 text-center transition-all duration-300"
        style={{
          border: `2px dashed ${dragOver ? 'var(--gold)' : 'var(--site-border)'}`,
          backgroundColor: dragOver ? 'var(--gold-soft)' : 'var(--site-bg)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          multiple
          className="hidden"
        />

        {uploading ? (
          <p
            className="text-sm font-bold uppercase"
            style={{ letterSpacing: '0.15em', color: 'var(--gold)' }}
          >
            Загрузка {uploadedCount + 1} из {cropQueue.length}...
          </p>
        ) : (
          <>
            <p
              className="font-serif text-xl sm:text-2xl font-bold mb-3"
              style={{ color: 'var(--site-text)' }}
            >
              Добавить фото
            </p>
            <p
              className="text-[12px] uppercase font-bold mb-4"
              style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
            >
              Можно выбрать сразу несколько
            </p>
            <p
              className="text-[11px] font-semibold"
              style={{ color: 'var(--site-muted)' }}
            >
              JPG · PNG · WEBP · до 10 МБ · до 10 файлов
            </p>
            <div
              className="w-12 h-px mx-auto my-4"
              style={{ backgroundColor: 'var(--gold)' }}
            />
            <p
              className="text-[12px] font-medium italic max-w-md mx-auto"
              style={{ color: 'var(--site-muted)' }}
            >
              После выбора — подгоните кадр для каждого фото по очереди.
              Первое фото станет главным (аверс).
            </p>
          </>
        )}
      </div>

      {error && (
        <p
          className="text-[12px] font-bold mt-3 px-3 py-2"
          style={{ backgroundColor: 'var(--tag-destructive)', color: '#000' }}
        >
          {error}
        </p>
      )}

      {cropQueue.length > 0 && (
        <ImageCropper
          imageSrc={cropQueue[cropIndex]}
          onCancel={cancelQueue}
          onApply={handleCropApply}
          queueInfo={{
            current: cropIndex + 1,
            total: cropQueue.length,
          }}
        />
      )}
    </>
  );
}