'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A-Z' },
  { value: 'name_desc', label: 'Name: Z-A' },
];

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (value && value !== 'newest') {
      newParams.set('sort', value);
    } else {
      newParams.delete('sort');
    }
    newParams.set('page', '1');
    startTransition(() => {
      router.push(`/shop?${newParams.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:block">Sort by</label>
      <select
        value={searchParams.get('sort') || 'newest'}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-pokemon-red cursor-pointer"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
