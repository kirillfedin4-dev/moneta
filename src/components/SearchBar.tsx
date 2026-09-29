import { useState, useEffect } from 'react';

const API = 'http://localhost:4000/api';

interface Tag {
  id: number;
  label: string;
  color: string;
  category: string;
  usage_count: number;
  is_dynamic: boolean;
}

interface SearchBarProps {
  filters: {
    q: string;
    tag_ids: number[];
    sort: string;
    year_from: string;
    year_to: string;
  };
  onUpdate: (key: any, value: any) => void;
  onToggleTag: (id: number) => void;
  onReset: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  denomination: 'Номинал',
  ruler: 'Правитель',
  metal: 'Металл',
  condition: 'Сохранность',
  era: 'Эпоха',
  theme: 'Тематика',
  geography: 'География',
  feature: 'Особенности',
  purpose: 'Назначение',
  term: 'Специальные',
  year: 'Год',
};

const CATEGORY_ORDER = [
  'denomination',
  'ruler',
  'metal',
  'condition',
  'era',
  'theme',
  'geography',
  'feature',
  'purpose',
  'term',
  'year',
];

export function SearchBar({
  filters,
  onUpdate,
  onToggleTag,
  onReset,
}: SearchBarProps) {
  const [grouped, setGrouped] = useState<Record<string, Tag[]>>({});
  const [tagsOpen, setTagsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set()
  );
  const [tagSearch, setTagSearch] = useState('');

  useEffect(() => {
    fetch(`${API}/tags/grouped`)
      .then((r) => r.json())
      .then(setGrouped)
      .catch(() => {});
  }, []);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const hasFilters =
    filters.q ||
    filters.tag_ids.length > 0 ||
    filters.year_from ||
    filters.year_to ||
    filters.sort !== 'ending_soon';

  const categories = Object.keys(grouped).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );

  // Фильтрация категорий по поиску тэгов
  const filterCategories = () => {
    if (!tagSearch.trim()) return categories;
    const q = tagSearch.toLowerCase();
    return categories.filter((cat) => {
      const tags = grouped[cat] || [];
      return (
        CATEGORY_LABELS[cat]?.toLowerCase().includes(q) ||
        tags.some((t) => t.label.toLowerCase().includes(q))
      );
    });
  };

  const visibleCategories = filterCategories();

  return (
    <div
      className="mb-8"
      style={{
        backgroundColor: 'var(--site-card)',
        border: '1px solid var(--site-border)',
      }}
    >
      {/* Верхняя панель */}
      <div className="p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Поиск */}
          <div className="flex-1 relative min-w-[200px]">
            <input
              type="text"
              value={filters.q}
              onChange={(e) => onUpdate('q', e.target.value)}
              placeholder="Поиск по названию или описанию..."
              className="w-full px-4 py-3 text-[14px] outline-none"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
                paddingLeft: 40,
              }}
            />
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]"
              style={{ color: 'var(--site-muted)' }}
            >
              ⌕
            </span>
            {filters.q && (
              <button
                type="button"
                onClick={() => onUpdate('q', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[16px] font-bold"
                style={{ color: 'var(--site-muted)', cursor: 'pointer' }}
                aria-label="Очистить"
              >
                ×
              </button>
            )}
          </div>

          {/* Кнопка тэгов */}
          <button
            type="button"
            onClick={() => setTagsOpen(!tagsOpen)}
            className="px-5 py-3 text-[11px] uppercase font-bold flex items-center gap-2"
            style={{
              letterSpacing: '0.12em',
              border: '1px solid var(--site-border)',
              backgroundColor: tagsOpen ? '#0A0A0A' : 'transparent',
              color: tagsOpen ? '#F2EBDD' : 'var(--site-text)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Тэги</span>
            {filters.tag_ids.length > 0 && (
              <span
                className="px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: tagsOpen
                    ? 'var(--gold)'
                    : '#0A0A0A',
                  color: tagsOpen ? '#000' : '#F2EBDD',
                }}
              >
                {filters.tag_ids.length}
              </span>
            )}
            <span style={{ fontSize: 10 }}>{tagsOpen ? '▴' : '▾'}</span>
          </button>

          {/* Год от */}
          <input
            type="number"
            value={filters.year_from}
            onChange={(e) => onUpdate('year_from', e.target.value)}
            placeholder="Год от"
            className="px-3 py-3 text-[13px] outline-none"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--site-border)',
              color: 'var(--site-text)',
              width: 110,
            }}
          />

          {/* Год до */}
          <input
            type="number"
            value={filters.year_to}
            onChange={(e) => onUpdate('year_to', e.target.value)}
            placeholder="Год до"
            className="px-3 py-3 text-[13px] outline-none"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--site-border)',
              color: 'var(--site-text)',
              width: 110,
            }}
          />

          {/* Сортировка */}
          <select
            value={filters.sort}
            onChange={(e) => onUpdate('sort', e.target.value)}
            className="px-4 py-3 text-[12px] uppercase font-bold outline-none"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--site-border)',
              color: 'var(--site-text)',
              letterSpacing: '0.12em',
              cursor: 'pointer',
              minWidth: 180,
            }}
          >
            <option value="ending_soon">Скоро окончатся</option>
            <option value="new">Новые</option>
            <option value="price_asc">Цена ↑</option>
            <option value="price_desc">Цена ↓</option>
            <option value="popular">Популярные</option>
          </select>

          {/* Сброс */}
          {hasFilters && (
            <button
              type="button"
              onClick={onReset}
              className="px-5 py-3 text-[11px] uppercase font-bold"
              style={{
                letterSpacing: '0.12em',
                border: '1px solid var(--site-border)',
                color: 'var(--site-muted)',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                whiteSpace: 'nowrap',
              }}
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Показ выбранных тэгов (когда список закрыт) */}
        {!tagsOpen && filters.tag_ids.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {filters.tag_ids.map((id) => {
              // Находим тэг по id
              let label = '';
              for (const cat of categories) {
                const found = grouped[cat]?.find((t) => t.id === id);
                if (found) {
                  label = found.label;
                  break;
                }
              }
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 px-2.5 py-1 text-[11px] uppercase font-bold"
                  style={{
                    letterSpacing: '0.08em',
                    backgroundColor: '#0A0A0A',
                    color: '#F2EBDD',
                  }}
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => onToggleTag(id)}
                    className="text-[12px] font-bold"
                    style={{
                      color: '#F2EBDD',
                      cursor: 'pointer',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                    }}
                    aria-label="Убрать"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Выпадающая панель с тэгами */}
      {tagsOpen && categories.length > 0 && (
        <div style={{ borderTop: '1px solid var(--site-line)' }}>
          {/* Поиск по тэгам */}
          <div
            className="p-3"
            style={{ borderBottom: '1px solid var(--site-line)' }}
          >
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Найти тэг (например, Золото)..."
              className="w-full px-3 py-2 text-[13px] outline-none"
              style={{
                backgroundColor: 'var(--site-bg)',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
              }}
            />
          </div>

          {/* Категории */}
          <div className="max-h-96 overflow-y-auto">
            {visibleCategories.map((cat) => {
              const tags = grouped[cat] || [];
              const filtered = tagSearch.trim()
                ? tags.filter((t) =>
                    t.label.toLowerCase().includes(tagSearch.toLowerCase())
                  )
                : tags;

              if (filtered.length === 0) return null;

              const isOpen =
                openCategories.has(cat) || tagSearch.trim().length > 0;
              const selectedInCat = filtered.filter((t) =>
                filters.tag_ids.includes(t.id)
              ).length;

              return (
                <div
                  key={cat}
                  style={{ borderBottom: '1px solid var(--site-line)' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between p-3 text-left"
                    style={{
                      cursor: 'pointer',
                      background: 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] uppercase font-bold"
                        style={{
                          letterSpacing: '0.15em',
                          color: 'var(--site-text)',
                        }}
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--site-muted)' }}
                      >
                        ({filtered.length})
                      </span>
                      {selectedInCat > 0 && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5"
                          style={{
                            backgroundColor: 'var(--gold)',
                            color: '#000',
                          }}
                        >
                          {selectedInCat}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[14px] font-bold"
                      style={{ color: 'var(--site-muted)' }}
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 flex flex-wrap gap-2">
                      {filtered.map((tag) => {
                        const active = filters.tag_ids.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => onToggleTag(tag.id)}
                            className="px-2.5 py-1 text-[11px] uppercase font-bold"
                            style={{
                              letterSpacing: '0.08em',
                              backgroundColor: active
                                ? '#0A0A0A'
                                : 'transparent',
                              color: active
                                ? '#F2EBDD'
                                : 'var(--site-text)',
                              border: active
                                ? '1px solid #0A0A0A'
                                : '1px solid var(--site-border)',
                              cursor: 'pointer',
                            }}
                          >
                            {tag.label}
                            {tag.usage_count > 0 && (
                              <span
                                className="ml-1.5 text-[9px]"
                                style={{
                                  opacity: active ? 0.7 : 0.5,
                                }}
                              >
                                {tag.usage_count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {visibleCategories.length === 0 && (
              <div className="p-6 text-center">
                <p
                  className="text-[12px]"
                  style={{ color: 'var(--site-muted)' }}
                >
                  Ничего не найдено по запросу «{tagSearch}»
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}