interface ImageQualityHintProps {
  sharpness: number;
  brightness: number;
}

export type QualityLevel = 'ok' | 'warn' | 'error';

export interface QualityResult {
  level: QualityLevel;
  hints: string[];
}

export function evaluateQuality(
  sharpness: number,
  brightness: number
): QualityResult {
  const hints: string[] = [];
  let level: QualityLevel = 'ok';

  // Резкость
  if (sharpness < 50) {
    hints.push('Фото выглядит размытым. Переснимите или приблизьте монету.');
    level = 'error';
  } else if (sharpness < 100) {
    hints.push('Резкость ниже идеальной — камера могла не сфокусироваться.');
    if (level === 'ok') level = 'warn';
  }

  // Яркость
  if (brightness < 70) {
    hints.push('Фото слишком тёмное. Снимите при дневном свете.');
    level = 'error';
  } else if (brightness < 90) {
    hints.push('Фото темноватое — детали могут быть плохо видны.');
    if (level === 'ok') level = 'warn';
  } else if (brightness > 220) {
    hints.push('Фото пересвечено. Блики могут скрывать детали.');
    if (level === 'ok') level = 'warn';
  }

  return { level, hints };
}

export function ImageQualityHint({ sharpness, brightness }: ImageQualityHintProps) {
  const { level, hints } = evaluateQuality(sharpness, brightness);

  if (level === 'ok') {
    return (
      <div
        className="mt-4 px-4 py-3 flex items-center gap-3"
        style={{
          borderLeft: '2px solid var(--gold)',
          backgroundColor: 'var(--gold-soft)',
        }}
      >
        <span
          className="w-5 h-5 flex items-center justify-center text-[12px] font-bold shrink-0"
          style={{
            color: 'var(--gold)',
            border: '1px solid var(--gold)',
            borderRadius: '50%',
          }}
        >
          ✓
        </span>
        <p
          className="text-[12px] font-semibold"
          style={{ color: 'var(--gold)', letterSpacing: '0.02em' }}
        >
          Фото прошло проверку качества
        </p>
      </div>
    );
  }

  const isError = level === 'error';
  const accent = isError ? 'var(--tag-destructive)' : 'var(--tag-primary)';
  const accentSoft = isError
    ? 'rgba(255, 10, 35, 0.06)'
    : 'rgba(255, 108, 10, 0.06)';

  return (
    <div className="mt-4 space-y-2">
      {hints.map((text, i) => (
        <div
          key={i}
          className="px-4 py-3 flex items-start gap-3"
          style={{
            borderLeft: `2px solid ${accent}`,
            backgroundColor: accentSoft,
          }}
        >
          <span
            className="w-5 h-5 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
            style={{
              color: accent,
              border: `1px solid ${accent}`,
              borderRadius: '50%',
            }}
          >
            {isError ? '✕' : '!'}
          </span>
          <p
            className="text-[12px] font-semibold leading-snug"
            style={{ color: 'var(--site-text)', letterSpacing: '0.01em' }}
          >
            {text}
          </p>
        </div>
      ))}
    </div>
  );
}