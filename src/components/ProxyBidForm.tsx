import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/hooks/useConfirm';

const API = 'http://localhost:4000/api';

interface ProxyBidFormProps {
  auctionId: number;
  currentPrice: number;
  bidStep: number;
  onBidPlaced?: () => void;
}

interface ProxyStatus {
  id: number;
  max_amount: string;
  is_active: boolean;
}

export function ProxyBidForm({
  auctionId,
  currentPrice,
  bidStep,
  onBidPlaced,
}: ProxyBidFormProps) {
  const { token, user } = useAuth();
  const confirm = useConfirm();

  const [proxy, setProxy] = useState<ProxyStatus | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);

  const minBid = currentPrice + bidStep;

  useEffect(() => {
    if (!token || !user) return;
    fetch(`${API}/auctions/${auctionId}/my-proxy`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setProxy)
      .catch(() => setProxy(null));
  }, [auctionId, token, user]);

  const refresh = async () => {
    if (!token) return;
    const r = await fetch(`${API}/auctions/${auctionId}/my-proxy`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setProxy(r.ok ? await r.json() : null);
  };

  const submit = async () => {
    if (!value) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/auctions/${auctionId}/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ max_amount: Number(value) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg('Авто-ставка установлена');
      setValue('');
      setOpen(false);
      await refresh();
      onBidPlaced?.();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const ok = await confirm({
      title: 'Отменить авто-ставку?',
      message:
        'Система больше не будет перебивать конкурентов. Ваша текущая ставка останется в силе.',
      confirmLabel: 'Отменить',
      cancelLabel: 'Оставить',
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/auctions/${auctionId}/proxy`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Не удалось отменить');
      await refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  if (proxy?.is_active) {
    return (
      <div
        className="mt-3 p-4"
        style={{
          backgroundColor: 'var(--site-card)',
          border: '1px solid var(--site-border)',
          borderLeft: '3px solid var(--gold)',
        }}
      >
        <p
          className="text-[10px] uppercase font-bold mb-1"
          style={{ letterSpacing: '0.15em', color: 'var(--gold)' }}
        >
          Авто-ставка активна
        </p>
        <p
          className="font-serif text-xl font-bold mb-3 tabular-nums"
          style={{ color: 'var(--site-text)' }}
        >
          До {Number(proxy.max_amount).toLocaleString('ru-RU')} ₽
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 py-2.5 text-[10px] uppercase font-bold"
            style={{
              letterSpacing: '0.12em',
              backgroundColor: '#0A0A0A',
              color: '#F2EBDD',
              border: '1px solid #0A0A0A',
              cursor: 'pointer',
            }}
          >
            Изменить
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="flex-1 py-2.5 text-[10px] uppercase font-bold disabled:opacity-40"
            style={{
              letterSpacing: '0.12em',
              backgroundColor: '#FFFFFF',
              color: 'var(--tag-destructive)',
              border: '1px solid var(--tag-destructive)',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? '...' : 'Отменить'}
          </button>
        </div>
        {msg && (
          <p
            className="text-[11px] font-semibold mt-3"
            style={{ color: 'var(--site-text)' }}
          >
            {msg}
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full py-2.5 text-[10px] uppercase font-bold"
        style={{
          letterSpacing: '0.12em',
          border: '1px dashed var(--site-border)',
          color: 'var(--site-muted)',
          backgroundColor: 'transparent',
          cursor: 'pointer',
        }}
      >
        Настроить авто-ставку
      </button>
    );
  }

  return (
    <div
      className="mt-3 p-4 space-y-3"
      style={{
        backgroundColor: 'var(--site-bg)',
        border: '1px solid var(--site-border)',
      }}
    >
      <div>
        <p
          className="text-[10px] uppercase font-bold mb-1"
          style={{ letterSpacing: '0.15em', color: 'var(--gold)' }}
        >
          Авто-ставка
        </p>
        <p className="text-[11px] mb-3" style={{ color: 'var(--site-muted)' }}>
          Система будет ставить за вас минимальным шагом, пока не достигнет
          вашего максимума. Вы платите меньше, если конкуренты остановятся.
        </p>
      </div>

      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Ваш максимум (мин. ${minBid.toLocaleString('ru-RU')})`}
        className="w-full px-3 py-2.5 text-[14px] font-semibold tabular-nums outline-none"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--site-border)',
          color: 'var(--site-text)',
        }}
      />

<div className="flex gap-2">
  {/* Отмена — светлая */}
  <button
    type="button"
    onClick={() => setOpen(false)}
    className="flex-1 py-3 text-[11px] uppercase font-bold"
    style={{
      letterSpacing: '0.12em',
      backgroundColor: '#FFFFFF',
      color: 'var(--site-text)',
      border: '1px solid var(--site-border)',
      cursor: 'pointer',
    }}
  >
    Отмена
  </button>

  {/* Установить — ЧЁРНАЯ с белым текстом */}
  <button
    type="button"
    onClick={submit}
    disabled={busy || !value}
    className="flex-1 py-3 text-[11px] uppercase font-bold disabled:opacity-40"
    style={{
      letterSpacing: '0.12em',
      backgroundColor: '#0A0A0A',
      color: '#F2EBDD',
      border: '1px solid #0A0A0A',
      cursor: busy || !value ? 'not-allowed' : 'pointer',
    }}
  >
    {busy ? '...' : 'Установить'}
  </button>
</div>

      {msg && (
        <p
          className="text-[11px] font-semibold"
          style={{ color: 'var(--site-text)' }}
        >
          {msg}
        </p>
      )}
    </div>
  );
}