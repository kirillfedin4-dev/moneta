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

interface TagsSelectorProps {
  selectedTagIds: number[];
  onToggle: (id: number) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  denomination: 'Номинал',
  ruler: 'Правитель',
  metal: 'Металл',
  condition: 'Сохранность',
  era: 'Эпоха',
  year: 'Год',
  theme: 'Тематика',
  geography: 'География',
  feature: 'Особенности',
  purpose: 'Назначение',
  term: 'Специальные тэги',
};

export function TagsSelector({
  selectedTagIds,
  onToggle,
}: TagsSelectorProps) {
  const [grouped, setGrouped] = useState<Record<string, Tag[]>>({});
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(['denomination', 'ruler'])
  );
  const [search, setSearch] = useState('');

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

  // Порядок отображения категорий
  const categoryOrder = [
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

  const categories = Object.keys(grouped).sort(
    (a, b) =>
      categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div
      style={{
        backgroundColor: 'var(--site-bg)',
        border: '1px solid var(--site-border)',
      }}
    >
      {/* Поиск */}
      <div
        className="p-3"
        style={{ borderBottom: '1px solid var(--site-border)' }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Найти тэг..."
          className="w-full px-3 py-2 text-[13px] outline-none"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--site-border)',
            color: 'var(--site-text)',
          }}
        />
      </div>

      {/* Категории */}
      <div className="max-h-96 overflow-y-auto">
        {categories.map((cat) => {
          const tags = grouped[cat] || [];
          const filtered = search.trim()
            ? tags.filter((t) =>
                t.label.toLowerCase().includes(search.toLowerCase())
              )
            : tags;

          if (filtered.length === 0) return null;

          const isOpen = openCategories.has(cat) || search.trim().length > 0;
          const selectedInCat = filtered.filter((t) =>
            selectedTagIds.includes(t.id)
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
                  className="text-[12px]"
                  style={{ color: 'var(--site-muted)' }}
                >
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 flex flex-wrap gap-2">
                  {filtered.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => onToggle(tag.id)}
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Сводка выбранных */}
      {selectedTagIds.length > 0 && (
        <div
          className="p-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--site-border)' }}
        >
          <span
            className="text-[11px] uppercase font-bold"
            style={{ letterSpacing: '0.12em', color: 'var(--site-muted)' }}
          >
            Выбрано: {selectedTagIds.length}
          </span>
        </div>
      )}
    </div>
  );
}