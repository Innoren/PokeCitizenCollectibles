'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

const rarities = ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Sealed Product'];
const conditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Factory Sealed'];
const categories = ['TCG Cards', '3D Prints'];

export default function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get('search') || '');

  const activeRarity = searchParams.get('rarity') || '';
  const activeCondition = searchParams.get('condition') || '';
  const activeCategory = searchParams.get('category') || '';

  const createQueryString = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'All') {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      return newParams.toString();
    },
    [searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(`/shop?${createQueryString({ search, page: '1' })}`);
    });
  };

  // Toggle a single-select filter: clicking the active value clears it.
  const toggleFilter = (key: string, value: string) => {
    const current = searchParams.get(key) || '';
    const next = current === value ? '' : value;
    startTransition(() => {
      router.push(`/shop?${createQueryString({ [key]: next, page: '1' })}`);
    });
  };

  const clearAll = () => {
    startTransition(() => {
      setSearch('');
      router.push('/shop');
    });
  };

  const hasActiveFilters = !!(activeRarity || activeCondition || activeCategory || searchParams.get('search'));

  return (
    <aside className="w-full md:w-64 shrink-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pokemon-red focus:ring-1 focus:ring-pokemon-red/20 transition-all"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-pokemon-red/30 border-t-pokemon-red rounded-full animate-spin" />
          </div>
        )}
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Filter By</h3>
          {hasActiveFilters && (
            <button onClick={clearAll} className="text-xs text-pokemon-red hover:underline font-medium">
              Clear all
            </button>
          )}
        </div>

        {/* Category */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Category</h4>
          <ul className="space-y-1.5">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <li key={cat}>
                  <button
                    onClick={() => toggleFilter('category', cat)}
                    className="flex items-center gap-2.5 w-full text-left group"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      active ? 'bg-pokemon-red border-pokemon-red' : 'border-gray-300 group-hover:border-pokemon-red'
                    }`}>
                      {active && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-sm transition-colors ${active ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {cat}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Rarity */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rarity</h4>
          <ul className="space-y-1.5">
            {rarities.map((rarity) => {
              const active = activeRarity === rarity;
              return (
                <li key={rarity}>
                  <button
                    onClick={() => toggleFilter('rarity', rarity)}
                    className="flex items-center gap-2.5 w-full text-left group"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      active ? 'bg-pokemon-red border-pokemon-red' : 'border-gray-300 group-hover:border-pokemon-red'
                    }`}>
                      {active && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-sm transition-colors ${active ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {rarity}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Condition */}
        <div className="px-4 py-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Condition</h4>
          <ul className="space-y-1.5">
            {conditions.map((condition) => {
              const active = activeCondition === condition;
              return (
                <li key={condition}>
                  <button
                    onClick={() => toggleFilter('condition', condition)}
                    className="flex items-center gap-2.5 w-full text-left group"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      active ? 'bg-pokemon-red border-pokemon-red' : 'border-gray-300 group-hover:border-pokemon-red'
                    }`}>
                      {active && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-sm transition-colors ${active ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {condition}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
