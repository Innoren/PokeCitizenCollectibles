'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    totalCards: number;
    totalOrders: number;
    totalRevenue: string;
    lowStock: number;
    outOfStock: number;
  };
  recentOrders: { id: number; customer: string; total: string; status: string; date: string }[];
}

interface CardOption {
  id: number;
  name: string;
  setName: string;
  imageUrl: string;
  featured: boolean;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome');
  const [allCards, setAllCards] = useState<CardOption[]>([]);
  const [featuredCardId, setFeaturedCardId] = useState<number | null>(null);
  const [featuredSaving, setFeaturedSaving] = useState(false);
  const [featuredSearch, setFeaturedSearch] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

    // Pull dashboard stats (reuse analytics 1y + inventory)
    Promise.all([
      fetch('/api/admin/analytics?period=1y').then((r) => r.json()),
      fetch('/api/cards?limit=1000').then((r) => r.json()),
      fetch('/api/admin/featured').then((r) => r.json()),
    ])
      .then(([analytics, inventory, featuredData]) => {
        const cards = inventory.cards || [];
        const lowStock = cards.filter((c: any) => c.stock > 0 && c.stock <= 3).length;
        const outOfStock = cards.filter((c: any) => c.stock === 0).length;

        setData({
          stats: {
            totalCards: cards.length,
            totalOrders: analytics.summary?.totalOrders || 0,
            totalRevenue: analytics.summary?.totalRevenue || '0.00',
            lowStock,
            outOfStock,
          },
          recentOrders: analytics.recentOrders?.slice(0, 5) || [],
        });

        setAllCards(cards.map((c: any) => ({ id: c.id, name: c.name, setName: c.setName, imageUrl: c.imageUrl, featured: c.featured })));
        if (featuredData.featured) {
          setFeaturedCardId(featuredData.featured.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSetFeatured = async (cardId: number | null) => {
    setFeaturedSaving(true);
    try {
      if (cardId === null) {
        await fetch('/api/admin/featured', { method: 'DELETE' });
        setFeaturedCardId(null);
      } else {
        const res = await fetch('/api/admin/featured', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId }),
        });
        if (res.ok) {
          setFeaturedCardId(cardId);
        }
      }
    } catch (e) {
      console.error('Failed to set featured card:', e);
    } finally {
      setFeaturedSaving(false);
    }
  };

  const filteredCards = allCards.filter((c) =>
    `${c.name} ${c.setName}`.toLowerCase().includes(featuredSearch.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{greeting} 👋</h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your store today.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading dashboard...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Revenue" value={`$${data?.stats.totalRevenue}`} accent="green" />
            <StatCard label="Total Orders" value={data?.stats.totalOrders ?? 0} accent="blue" />
            <StatCard label="Products Listed" value={data?.stats.totalCards ?? 0} accent="gray" />
            <StatCard
              label="Need Attention"
              value={(data?.stats.lowStock ?? 0) + (data?.stats.outOfStock ?? 0)}
              accent="red"
              subtitle={`${data?.stats.outOfStock ?? 0} out, ${data?.stats.lowStock ?? 0} low`}
            />
          </div>

          {/* Quick actions */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickAction
                href="/admin/inventory"
                icon="➕"
                title="Add a Product"
                desc="List a new card or sealed product"
              />
              <QuickAction
                href="/admin/pricing"
                icon="💰"
                title="Check Prices"
                desc="Compare to TCGPlayer market rates"
              />
              <QuickAction
                href="/admin/analytics"
                icon="📊"
                title="View Analytics"
                desc="Track sales and top performers"
              />
            </div>
          </div>

          {/* Featured Product Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Featured Product</h2>
                <p className="text-xs text-gray-400 mt-0.5">This product appears as the hero spotlight on the homepage</p>
              </div>
              {featuredCardId && (
                <button
                  onClick={() => handleSetFeatured(null)}
                  disabled={featuredSaving}
                  className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50"
                >
                  Remove featured
                </button>
              )}
            </div>

            {/* Current featured */}
            {featuredCardId && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                <span className="text-xl">⭐</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {allCards.find((c) => c.id === featuredCardId)?.name || `Card #${featuredCardId}`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {allCards.find((c) => c.id === featuredCardId)?.setName || ''}
                  </p>
                </div>
              </div>
            )}

            {/* Search & select */}
            <div className="relative">
              <input
                type="text"
                value={featuredSearch}
                onChange={(e) => setFeaturedSearch(e.target.value)}
                placeholder="Search products to feature..."
                className="w-full px-4 py-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pokemon-red focus:ring-1 focus:ring-pokemon-red/20 transition-all"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {featuredSearch && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredCards.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No products match your search</p>
                ) : (
                  filteredCards.slice(0, 10).map((card) => (
                    <button
                      key={card.id}
                      onClick={() => { handleSetFeatured(card.id); setFeaturedSearch(''); }}
                      disabled={featuredSaving}
                      className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-xs">🎴</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{card.name}</p>
                        <p className="text-xs text-gray-500 truncate">{card.setName}</p>
                      </div>
                      {card.id === featuredCardId && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Current</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Recent Orders</h2>
              <Link href="/admin/analytics" className="text-xs text-pokemon-red font-medium hover:underline">
                View all →
              </Link>
            </div>
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              <div className="space-y-1">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                      <p className="text-xs text-gray-400">{new Date(order.date).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">${order.total}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        order.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">
                No orders yet. Share your store to get your first sale! 🎉
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, subtitle }: {
  label: string;
  value: string | number;
  accent: 'green' | 'blue' | 'gray' | 'red';
  subtitle?: string;
}) {
  const colors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    gray: 'text-gray-900',
    red: 'text-pokemon-red',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl md:text-3xl font-bold mt-2 ${colors[accent]}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function QuickAction({ href, icon, title, desc }: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-pokemon-red/40 hover:shadow-md transition-all"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-semibold text-gray-900 group-hover:text-pokemon-red transition-colors">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </Link>
  );
}
