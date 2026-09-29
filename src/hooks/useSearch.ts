import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:4000/api';

export interface SearchFilters {
  q: string;
  tag_ids: number[];
  metal: string;
  year_from: string;
  year_to: string;
  price_from: string;
  price_to: string;
  sort: 'new' | 'price_asc' | 'price_desc' | 'ending_soon' | 'popular';
}

export const emptyFilters: SearchFilters = {
  q: '',
  tag_ids: [],
  metal: '',
  year_from: '',
  year_to: '',
  price_from: '',
  price_to: '',
  sort: 'ending_soon',
};

export function useSearch() {
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async (f: SearchFilters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (f.q.trim()) params.set('q', f.q.trim());
      if (f.tag_ids.length) params.set('tags', f.tag_ids.join(','));
      if (f.metal) params.set('metal', f.metal);
      if (f.year_from) params.set('year_from', f.year_from);
      if (f.year_to) params.set('year_to', f.year_to);
      if (f.price_from) params.set('price_from', f.price_from);
      if (f.price_to) params.set('price_to', f.price_to);
      if (f.sort) params.set('sort', f.sort);

      const res = await fetch(`${API}/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      setResults(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Авто-поиск при изменении фильтров с задержкой (debounce)
  useEffect(() => {
    const timer = setTimeout(() => search(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, search]);

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tagId: number) => {
    setFilters((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  const reset = () => setFilters(emptyFilters);

  return {
    filters,
    results,
    loading,
    error,
    updateFilter,
    toggleTag,
    reset,
  };
}