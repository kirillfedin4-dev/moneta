import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function AuthForm() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Если пользователь уже залогинен — сразу уводим
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (mode === 'login') {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      // Редирект
      navigate('/', { replace: true });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--site-border)',
    color: 'var(--site-text)',
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    fontWeight: 500,
    outline: 'none',
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

  return (
    <form
      onSubmit={submit}
      className="max-w-md mx-auto p-10 space-y-5 text-left"
      style={{
        backgroundColor: 'var(--site-card)',
        border: '1px solid var(--site-border)',
        boxShadow: '0 20px 50px -25px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="text-center mb-2">
        <h2
          className="font-serif text-3xl font-bold mb-2"
          style={{ color: 'var(--site-text)' }}
        >
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </h2>
        <p
          className="text-[12px] font-medium"
          style={{ color: 'var(--site-muted)' }}
        >
          {mode === 'login'
            ? 'Войдите, чтобы участвовать в торгах'
            : 'Создайте аккаунт для участия в аукционе'}
        </p>
      </div>

      <div>
        <label style={labelStyle}>Имя пользователя</label>
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          style={inputStyle}
          required
        />
      </div>

      {mode === 'register' && (
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={inputStyle}
            required
          />
        </div>
      )}

      <div>
        <label style={labelStyle}>Пароль</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={inputStyle}
          required
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 text-[11px] uppercase font-bold transition-all disabled:opacity-40"
        style={{
          letterSpacing: '0.12em',
          backgroundColor: 'var(--site-text)',
          color: 'var(--site-bg)',
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? '...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
      </button>

      {err && (
        <p
          className="text-[12px] font-bold px-3 py-2"
          style={{ backgroundColor: 'var(--tag-destructive)', color: '#FFF' }}
        >
          {err}
        </p>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="text-[11px] uppercase font-bold w-full pt-3 transition-opacity hover:opacity-60"
        style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
      >
        {mode === 'login'
          ? 'Нет аккаунта? Регистрация'
          : 'Уже есть аккаунт? Войти'}
      </button>
    </form>
  );
}