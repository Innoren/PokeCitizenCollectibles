'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cart';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
}

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Check if user is logged in
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => { if (data.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Announcement bar */}
      <div className="bg-gray-900 text-white text-center text-xs sm:text-sm py-2 px-4">
        <span className="text-gray-300">New arrivals added weekly — </span>
        <Link href="/shop" className="font-semibold underline underline-offset-2 hover:text-pokemon-yellow transition-colors">
          Shop the latest
        </Link>
      </div>

      {/* Top bar */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-full border-2 border-gray-900 flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white" />
                <div className="w-full h-[2px] bg-gray-900 absolute z-10" />
                <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-900 z-20" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                PokeCitizen
              </span>
            </Link>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Pokémon cards..."
                  className="w-full px-4 py-2.5 pr-12 border-2 border-gray-200 rounded-lg text-sm focus:border-pokemon-red focus:ring-0 outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-3 bg-pokemon-red text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Account */}
              {mounted && user ? (
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-pokemon-red/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-pokemon-red">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:inline font-medium">{user.name.split(' ')[0]}</span>
                </Link>
              ) : mounted ? (
                <Link
                  href="/login"
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">SIGN IN</span>
                </Link>
              ) : null}

              {/* Cart */}
              <Link
                href="/cart"
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors relative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <span className="hidden sm:inline">MY CART</span>
                {mounted && getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-pokemon-red rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {getTotalItems()}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category navigation */}
      <nav className="border-b border-gray-100 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 h-12 text-sm font-medium whitespace-nowrap">
            <Link href="/shop" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              All Cards
            </Link>
            <Link href="/shop?category=3D+Prints" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              3D Prints
            </Link>
            <Link href="/shop?rarity=Common" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Common
            </Link>
            <Link href="/shop?rarity=Uncommon" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Uncommon
            </Link>
            <Link href="/shop?rarity=Rare" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Rare
            </Link>
            <Link href="/shop?rarity=Ultra+Rare" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Ultra Rare
            </Link>
            <Link href="/shop?rarity=Secret+Rare" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Secret Rare
            </Link>
            <span className="mx-2 text-gray-300">|</span>
            <Link href="/shop?condition=Mint" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Mint
            </Link>
            <Link href="/shop?condition=Near+Mint" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Near Mint
            </Link>
            <Link href="/shop?rarity=Sealed+Product" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Sealed Product
            </Link>
            <Link href="/shop?sort=price_desc" className="px-3 py-1.5 text-gray-700 hover:text-pokemon-red hover:bg-red-50 rounded-md transition-colors">
              Most Expensive
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
