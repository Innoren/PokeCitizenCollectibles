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
    // Database not set up yet — show empty state
    console.error('Failed to fetch cards:', e);
  }

  const spotlight = featuredCards.find((c) => c.imageUrl) || featuredCards[0] || null;

  return (
    <div className="bg-gray-50/60">
      <Hero featured={spotlight} />

      {/* Colorful category tiles — Pokemon Center style */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6 text-center">
          Shop the Collection
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Single Cards', href: '/shop', emoji: '🎴', gradient: 'from-red-500 to-orange-400' },
            { name: '3D Prints', href: '/shop?category=3D+Prints', emoji: '🖨️', gradient: 'from-emerald-500 to-teal-400' },
            { name: 'Sealed Product', href: '/shop?rarity=Sealed+Product', emoji: '📦', gradient: 'from-blue-500 to-cyan-400' },
            { name: 'Secret Rare', href: '/shop?rarity=Secret+Rare', emoji: '⭐', gradient: 'from-amber-400 to-yellow-500' },
          ].map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${cat.gradient} p-6 h-44 flex flex-col justify-between shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5`}
            >
              <div className="absolute -right-5 -bottom-5 text-9xl opacity-20 group-hover:scale-110 group-hover:opacity-30 transition-all duration-300">
                {cat.emoji}
              </div>
              <span className="text-4xl drop-shadow-sm">{cat.emoji}</span>
              <div>
                <p className="text-white font-extrabold text-xl leading-tight drop-shadow">{cat.name}</p>
                <span className="text-white/90 text-sm font-semibold">Shop now →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Cards / New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">New Arrivals</h2>
            <p className="text-gray-500 text-sm mt-1">Freshly added to the store</p>
          </div>
          <Link
            href="/shop"
            className="px-5 py-2.5 text-sm font-bold text-white bg-pokemon-red rounded-full hover:bg-red-600 transition-all whitespace-nowrap shadow-sm hover:shadow-md"
          >
            View All
          </Link>
        </div>
        <CardGrid cards={featuredCards} />
      </section>

      {/* Promo banner strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-gray-900 to-gray-800 overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-pokemon-red/25 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-56 h-56 bg-pokemon-blue/25 rounded-full blur-3xl" />
          <div className="relative px-8 py-12 md:px-16 md:py-14 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                Free Shipping on Orders Over $200
              </h3>
              <p className="text-gray-300">Every order ships in protective sleeves and top loaders.</p>
            </div>
            <Link
              href="/shop"
              className="px-8 py-4 bg-pokemon-yellow text-gray-900 font-extrabold rounded-full hover:bg-yellow-300 transition-all whitespace-nowrap shrink-0 hover:scale-105"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </section>

      {/* Shop by Rarity */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6 text-center">
          Shop by Rarity
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: 'Common', color: 'bg-gray-100 border-gray-200 hover:border-gray-400', emoji: '⚪' },
            { name: 'Uncommon', color: 'bg-green-50 border-green-200 hover:border-green-400', emoji: '🟢' },
            { name: 'Rare', color: 'bg-blue-50 border-blue-200 hover:border-blue-400', emoji: '🔵' },
            { name: 'Ultra Rare', color: 'bg-purple-50 border-purple-200 hover:border-purple-400', emoji: '🟣' },
            { name: 'Secret Rare', color: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400', emoji: '⭐' },
          ].map((rarity) => (
            <Link
              key={rarity.name}
              href={`/shop?rarity=${encodeURIComponent(rarity.name)}`}
              className={`rounded-2xl p-5 border-2 ${rarity.color} hover:scale-[1.03] transition-all duration-200 text-center`}
            >
              <div className="text-3xl mb-2">{rarity.emoji}</div>
              <div className="text-gray-800 font-bold text-sm">{rarity.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '🛡️', title: 'Authenticity Guaranteed', desc: 'Every card verified before listing' },
            { icon: '📦', title: 'Secure Packaging', desc: 'Sleeves and top loaders included' },
            { icon: '🚚', title: 'Free Shipping', desc: 'Free on orders over $200' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-3xl">{item.icon}</div>
              <div>
                <h3 className="text-gray-900 font-bold text-sm">{item.title}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Promise */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">Our Promise</h2>
        <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
          The thrill of opening. The confidence of buying right. We&apos;re collectors ourselves — every card is hand-inspected, graded honestly, and shipped like we&apos;d want to receive it. Your collection deserves that respect.
        </p>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Hand-inspected</span>
          <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Honest grading</span>
          <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Collector owned</span>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="flex items-center justify-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Customer Reviews</h2>
        <p className="text-gray-500 text-sm">Reviews from verified buyers coming soon.</p>
      </section>
    </div>
  );
}
