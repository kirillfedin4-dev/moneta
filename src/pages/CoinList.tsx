import { CoinCard } from '@/components/CoinCard';
import { SearchBar } from '@/components/SearchBar';
import { useSearch } from '@/hooks/useSearch';

export function CoinList() {
  const {
    filters,
    results,
    loading,
    error,
    updateFilter,
    toggleTag,
    reset,
  } = useSearch();

  return (
    <>
      {/* Hero */}
      <section className="mb-16 text-center max-w-3xl mx-auto">
        <p
          className="text-[11px] uppercase font-bold mb-5"
          style={{
            letterSpacing: '0.25em',
            color: 'var(--gold)',
            animation:
              'fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards',
            opacity: 0,
          }}
        >
          Коллекционные монеты
        </p>

        <h1
          className="font-serif text-5xl sm:text-6xl font-bold mb-6 leading-[1.08]"
          style={{
            color: 'var(--site-text)',
            animation:
              'fadeInUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards',
            opacity: 0,
          }}
        >
          Сокровища, которых
          <br />
          <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>
            касалась история
          </em>
        </h1>

        <div
          className="mx-auto mb-6"
          style={{
            width: 0,
            height: 1,
            backgroundColor: 'var(--gold)',
            animation:
              'lineGrow 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards',
          }}
        />

        <p
          className="text-lg font-medium leading-relaxed"
          style={{
            color: 'var(--site-muted)',
            animation:
              'fadeInUp 1s cubic-bezier(0.22, 1, 0.36, 1) 0.75s forwards',
            opacity: 0,
          }}
        >
          Аукцион редких монет Российской империи и мира. Каждый лот —
          отобранный экземпляр с историей и характером.
        </p>
      </section>

      {/* Заголовок + поиск */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2
            className="font-serif text-4xl font-bold mb-3"
            style={{ color: 'var(--site-text)' }}
          >
            Активные лоты
          </h2>
          <p
            className="text-[12px] uppercase font-bold"
            style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
          >
            {loading ? 'Загрузка...' : `${results.length} найдено`}
          </p>
        </div>
        <div
          className="hidden sm:block h-px flex-1 ml-8"
          style={{ backgroundColor: 'var(--site-line)' }}
        />
      </div>

      {/* Поиск и фильтры */}
      <SearchBar
        filters={filters}
        onUpdate={updateFilter}
        onToggleTag={toggleTag}
        onReset={reset}
      />

      {error && (
        <p
          className="text-sm font-bold px-4 py-2 inline-block mb-4"
          style={{ backgroundColor: 'var(--tag-destructive)', color: '#FFF' }}
        >
          {error}
        </p>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-20">
          <p
            className="font-serif text-3xl mb-3"
            style={{ color: 'var(--site-text)' }}
          >
            Ничего не найдено
          </p>
          <p className="text-sm" style={{ color: 'var(--site-muted)' }}>
            Попробуйте изменить фильтры или очистить поиск
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {results.map((coin: any) => (
          <CoinCard key={coin.id} coin={coin} />
        ))}
      </div>
    </>
  );
}