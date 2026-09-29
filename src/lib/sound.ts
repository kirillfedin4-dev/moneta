let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== 'undefined') {
  muted = localStorage.getItem('feed_muted') === '1';
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function ensureRunning(audio: AudioContext) {
  if (audio.state === 'suspended') {
    audio.resume().catch(() => {});
  }
}

/**
 * Мягкий "блип" из двух нот — как уведомление в iOS.
 * Частоты: F#5 (740 Гц) → C#6 (1108 Гц), плавное затухание.
 */
export function playBidTick() {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);

  const now = audio.currentTime;

  // Первая нота
  playNote(audio, 740, now, 0.12, 0.06, 'sine');
  // Вторая — чуть выше и позже
  playNote(audio, 1108, now + 0.06, 0.18, 0.05, 'sine');

  // Лёгкий обертон для "теплоты"
  playNote(audio, 1480, now + 0.06, 0.12, 0.02, 'triangle');
}

/**
 * Гонг для anti-sniping — три ноты вверх.
 * C5 (523) → E5 (659) → G5 (784)
 */
export function playExtendedGong() {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);

  const now = audio.currentTime;

  playNote(audio, 523, now, 0.25, 0.07, 'sine');
  playNote(audio, 659, now + 0.12, 0.3, 0.07, 'sine');
  playNote(audio, 784, now + 0.24, 0.5, 0.08, 'sine');
}

/**
 * Мягкий "щелчок" при закрытии аукциона.
 */
export function playAuctionClosed() {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);

  const now = audio.currentTime;
  playNote(audio, 880, now, 0.15, 0.05, 'sine');
  playNote(audio, 660, now + 0.1, 0.25, 0.05, 'sine');
}

/**
 * Моя ставка — приятный "победоносный" звук.
 */
export function playMyBid() {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);

  const now = audio.currentTime;
  playNote(audio, 880, now, 0.1, 0.06, 'sine');
  playNote(audio, 1174, now + 0.08, 0.2, 0.06, 'sine');
  playNote(audio, 1480, now + 0.16, 0.25, 0.05, 'sine');
}

// ────────────────────────────────────────
// Общий помощник: одна нота с обёрткой attack/release
// ────────────────────────────────────────
function playNote(
  audio: AudioContext,
  freq: number,
  start: number,
  dur: number,
  volume: number,
  type: OscillatorType = 'sine'
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  // Мягкая атака 10 мс и плавное затухание
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start(start);
  osc.stop(start + dur + 0.05);
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== 'undefined') {
    localStorage.setItem('feed_muted', value ? '1' : '0');
  }
}