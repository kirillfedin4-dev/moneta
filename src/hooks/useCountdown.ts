import { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // всего миллисекунд до конца
}

function calcTimeLeft(endTime: string): TimeLeft {
  const total = new Date(endTime).getTime() - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds, total };
}

export function useCountdown(endTime: string) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(endTime));

  useEffect(() => {
    setTimeLeft(calcTimeLeft(endTime));
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return timeLeft;
}