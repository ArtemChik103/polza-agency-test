'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { IconSearch, IconX, IconFilter, IconRefresh } from '@tabler/icons-react';

interface SearchFilterProps {
  cities: string[];
  initialSearch: string;
  initialCity: string;
  totalCount: number;
}

export default function SearchFilter({
  cities,
  initialSearch,
  initialCity,
  totalCount,
}: SearchFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [city, setCity] = useState(initialCity);

  useEffect(() => {
    setSearch(initialSearch);
    setCity(initialCity);
  }, [initialSearch, initialCity]);

  const updateQueryParams = (newSearch: string, newCity: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set('search', newSearch.trim());
    if (newCity) params.set('city', newCity);
    params.set('page', '1');

    startTransition(() => {
      router.push(`/companies?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams(search, city);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = e.target.value;
    setCity(selectedCity);
    updateQueryParams(search, selectedCity);
  };

  const handleClear = () => {
    setSearch('');
    setCity('');
    startTransition(() => {
      router.push('/companies');
    });
  };

  const hasActiveFilters = search || city;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-2xl space-y-4">
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col md:flex-row gap-3 items-stretch md:items-center"
      >
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <IconSearch size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск компании по названию..."
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-950/90 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                updateQueryParams('', city);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        {/* City Select */}
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <IconFilter size={18} />
          </div>
          <select
            value={city}
            onChange={handleCityChange}
            className="w-full pl-9 pr-8 py-2.5 bg-zinc-950/90 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none transition-all cursor-pointer"
          >
            <option value="">Все города ({cities.length})</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? 'Загрузка...' : 'Найти'}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Сбросить все фильтры"
            >
              <IconRefresh size={16} />
              <span className="hidden sm:inline">Сбросить</span>
            </button>
          )}
        </div>
      </form>

      {/* Filter Info / Badges */}
      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/60 gap-2">
        <div className="flex items-center gap-2">
          <span>Найдено записей: <strong className="text-zinc-100 font-semibold">{totalCount}</strong></span>
          {isPending && <span className="text-indigo-400 animate-pulse">● Обновление...</span>}
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Активные фильтры:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Название: {search}
              </span>
            )}
            {city && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Город: {city}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
