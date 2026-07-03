import { db } from '@/db';
import { cards } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Hero from '@/components/Hero';
import CardGrid from '@/components/CardGrid';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let featuredCards: any[] = [];
  try {
    featuredCards = await db
      .select()
      .from(cards)
      .orderBy(desc(cards.createdAt))
      .limit(8);
  } catch (e) {
    console.error('Failed to fetch cards:', e);
  }

  return (
    <div className="bg-gray-50">
      <Hero />

      {/* Category tiles — big and image-forward like Pokemon Center */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
          Shop the Collection
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Single Cards', href: '/shop?category=Single+Card', emoji: '🎴', gradient: 'from-red-500 to-orange-400' },
            { name: 'Sealed Product', href: '/shop?category=Sealed+Product', emoji: '📦', gradient: 'from-blue-500 to-cyan-400' },
            { name: 'Ultra Rare', href: '/shop?rarity=Ultra+Rare', emoji: '✨', gradient: 'from-purple-500 to-pink-400' },
            { name: 'Secret Rare', href: '/shop?rarity=Secret+Rare', emoji: '⭐', gradient: 'from-yellow-400 to-amber-500' },
          ].map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.gradient} p-6 h-40 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="absolute -right-4 -bottom-4 text-8xl opacity-20 group-hover:scale-110 group-hover:opacity-30 transition-all duration-300">
                {cat.emoji}
              </div>
              <span className="text-3xl">{cat.emoji}</span>
              <div>
                <p className="text-white font-bold text-lg leading-tight">{cat.name}</p>
                <span className="text-white/80 text-sm font-medium">Shop now →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">New Arrivals</h2>
            <p className="text-gray-500 text-sm mt-1">Freshly added to the store</p>
          </div>
          <Link
            href="/shop"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-pokemon-red rounded-full hover:bg-red-600 transition-all whitespace-nowrap"
          >
            View All
          </Link>
        </div>
        <CardGrid cards={featuredCards} />
      </section>

      {/* Promo banner strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-gray-900 to-gray-800 overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-pokemon-red/20 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="relative px-8 py-12 md:px-16 md:py-14 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Free Shipping on Orders Over $200
              </h3>
              <p className="text-gray-300">Every card ships within 24 hours in protective packaging.</p>
            </div>
            <Link
              href="/shop"
              className="px-8 py-4 bg-pokemon-yellow text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-all whitespace-nowrap shrink-0"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '🛡️', title: 'Authenticity Guaranteed', desc: 'Every card verified before listing' },
            { icon: '📦', title: 'Secure Packaging', desc: 'Sleeves and top loaders included' },
            { icon: '⚡', title: 'Fast Shipping', desc: 'Ships within 24 hours, free over $200' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4 p-6 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-3xl">{item.icon}</div>
              <div>
                <h3 className="text-gray-900 font-semibold">{item.title}</h3>
                <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
