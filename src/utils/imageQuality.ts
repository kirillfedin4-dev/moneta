export async function estimateSharpness(imageSrc: string): Promise<number> {
  const img = await loadImage(imageSrc);
  const scale = 400 / Math.max(img.width, img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] =
      0.299 * data[i * 4] +
      0.587 * data[i * 4 + 1] +
      0.114 * data[i * 4 + 2];
  }

  const laplacian = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      laplacian[idx] =
        gray[idx - w] +
        gray[idx + w] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];
    }
  }

  let mean = 0;
  for (let i = 0; i < laplacian.length; i++) mean += laplacian[i];
  mean /= laplacian.length;

  let variance = 0;
  for (let i = 0; i < laplacian.length; i++) {
    variance += (laplacian[i] - mean) ** 2;
  }
  variance /= laplacian.length;

  return variance;
}

export async function estimateBrightness(imageSrc: string): Promise<number> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const scale = 200 / Math.max(img.width, img.height);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) return 128;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let sum = 0;
  let darkPixels = 0;
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    if (lum < 50) darkPixels++;
  }

  const avg = sum / total;
  const darkRatio = darkPixels / total;

  // Если больше 50% пикселей тёмные — сильно занижаем оценку
  if (darkRatio > 0.5) {
    return avg * 0.3;
  }

  return avg;
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