import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { CoinList } from '@/pages/CoinList';
import { CoinDetail } from '@/pages/CoinDetail';
import { CreateCoin } from '@/pages/CreateCoin';
import { Shop } from '@/pages/Shop';
import { AuthForm } from '@/components/AuthForm';
import { LiveFeed } from '@/components/LiveFeed';
import { OutbidToasts } from '@/components/OutbidToast';
import { useAuth } from '@/contexts/AuthContext';
import { ShopItem } from '@/pages/ShopItem';
import { PushToggle } from '@/components/PushToggle';
import { Profile } from '@/pages/Profile';

function App() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col" style={{ color: 'var(--site-text)' }}>
      <header
        className="sticky top-0 z-20"
        style={{
          backgroundColor: 'rgba(242, 235, 221, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--site-line)',
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-serif text-2xl font-bold"
              style={{
                border: '1.5px solid var(--gold)',
                color: 'var(--gold)',
                backgroundColor: 'var(--gold-soft)',
              }}
            >
              М
            </div>
            <div className="leading-none">
              <h1
                className="font-serif text-2xl font-bold"
                style={{ color: 'var(--site-text)' }}
              >
                Монета
              </h1>
              <p
                className="text-[10px] uppercase font-bold mt-1"
                style={{ letterSpacing: '0.25em', color: 'var(--site-muted)' }}
              >
                Аукционный дом
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-4 py-2 text-[11px] uppercase font-bold"
              style={{
                letterSpacing: '0.15em',
                color: isActive('/') ? 'var(--site-text)' : 'var(--site-muted)',
                borderBottom: isActive('/')
                  ? '2px solid var(--gold)'
                  : '2px solid transparent',
              }}
            >
              Аукцион
            </Link>
            <Link
              to="/shop"
              className="px-4 py-2 text-[11px] uppercase font-bold"
              style={{
                letterSpacing: '0.15em',
                color: isActive('/shop') ? 'var(--site-text)' : 'var(--site-muted)',
                borderBottom: isActive('/shop')
                  ? '2px solid var(--gold)'
                  : '2px solid transparent',
              }}
            >
              Магазин
            </Link>
          </nav>

          <div className="flex gap-2 items-center">
            {user ? (
              <>
<Link
  to="/profile"
  className="text-[11px] uppercase font-bold hidden sm:block px-3 py-1.5 hover:opacity-70"
  style={{
    letterSpacing: '0.15em',
    color: 'var(--site-text)',
    backgroundColor: 'var(--gold-soft)',
    textDecoration: 'none',
  }}
>
  {user.username}
</Link>
                <PushToggle />
                <Link
                  to="/create"
                  className="px-5 py-2.5 text-[11px] uppercase font-bold hover:-translate-y-0.5 transition-transform"
                  style={{
                    letterSpacing: '0.15em',
                    backgroundColor: 'var(--site-text)',
                    color: 'var(--site-bg)',
                  }}
                >
                  + Лот
                </Link>
                <button
                  onClick={logout}
                  className="px-5 py-2.5 text-[11px] uppercase font-bold hover:opacity-70"
                  style={{
                    letterSpacing: '0.15em',
                    border: '1px solid var(--site-border)',
                    color: 'var(--site-text)',
                  }}
                >
                  Выйти
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="px-6 py-2.5 text-[11px] uppercase font-bold hover:-translate-y-0.5 transition-transform"
                style={{
                  letterSpacing: '0.15em',
                  backgroundColor: 'var(--site-text)',
                  color: 'var(--site-bg)',
                }}
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 w-full flex-1">
        <Routes>
          <Route path="/" element={<CoinList />} />
          <Route path="/coin/:id" element={<CoinDetail />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/create" element={<CreateCoin />} />
          <Route path="/auth" element={<AuthForm />} />
          <Route path="*" element={<CoinList />} />
          <Route path="/shop/:id" element={<ShopItem />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop" element={<Shop />} />
        </Routes>
      </main>

      <LiveFeed />
      <OutbidToasts />

      <footer
        className="py-8 text-center text-[11px] uppercase font-bold"
        style={{
          letterSpacing: '0.25em',
          color: 'var(--site-muted)',
          borderTop: '1px solid var(--site-line)',
        }}
      >
        © {new Date().getFullYear()} Монета · Аукционный дом
      </footer>
    </div>
  );
}

export default App;