'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

const rarities = ['All', 'Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare'];
const conditions = ['All', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Played'];
const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A-Z' },
  { value: 'name_desc', label: 'Name: Z-A' },
];

export default function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get('search') || '');

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

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      router.push(`/shop?${createQueryString({ [key]: value, page: '1' })}`);
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for Pokemon cards..."
          className="w-full px-5 py-3 pl-12 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pokemon-yellow/50 focus:ring-1 focus:ring-pokemon-yellow/25 transition-all"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isPending && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-pokemon-yellow/30 border-t-pokemon-yellow rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Rarity Filter */}
        <select
          value={searchParams.get('rarity') || 'All'}
          onChange={(e) => handleFilterChange('rarity', e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-pokemon-yellow/50 transition-all cursor-pointer"
        >
          <option value="All">All Rarities</option>
          {rarities.slice(1).map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </select>

        {/* Condition Filter */}
        <select
          value={searchParams.get('condition') || 'All'}
          onChange={(e) => handleFilterChange('condition', e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-pokemon-yellow/50 transition-all cursor-pointer"
        >
          <option value="All">All Conditions</option>
          {conditions.slice(1).map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={searchParams.get('sort') || 'newest'}
          onChange={(e) => handleFilterChange('sort', e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-pokemon-yellow/50 transition-all cursor-pointer"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
