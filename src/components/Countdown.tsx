import { useCountdown } from '@/hooks/useCountdown';

interface CountdownProps {
  endTime: string;
  onExpired?: () => void;
}

export function Countdown({ endTime, onExpired }: CountdownProps) {
  const { days, hours, minutes, seconds, total } = useCountdown(endTime);

  if (total === 0 && onExpired) onExpired();

  if (total === 0) {
    return (
      <span
        className="text-sm font-bold"
        style={{ color: 'var(--site-muted)' }}
      >
        Завершён
      </span>
    );
  }

  const isUrgent = total < 60 * 60 * 1000;       // < 1 часа
  const isToday = total < 24 * 60 * 60 * 1000;   // < суток

  const color = isUrgent
    ? 'var(--tag-destructive)'
    : isToday
      ? 'var(--gold)'
      : 'var(--site-text)';

  const pad = (n: number) => String(n).padStart(2, '0');

  // Если дней много — компактно, без секунд
  if (days > 0) {
    return (
      <span
        className="font-serif font-bold tabular-nums leading-none whitespace-nowrap"
        style={{ color, fontSize: '1.25rem' }}
      >
        {days}д {pad(hours)}:{pad(minutes)}
      </span>
    );
  }

  // Иначе — полный формат с пульсацией при срочности
  return (
    <span
      className={`font-serif font-bold tabular-nums leading-none whitespace-nowrap ${
        isUrgent ? 'soft-pulse' : ''
      }`}
      style={{ color, fontSize: '1.5rem' }}
    >
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}