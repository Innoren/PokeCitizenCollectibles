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

  return (
    <div>
      <Hero />

      {/* Featured Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Featured Cards
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Latest additions to our collection</p>
          </div>
          <Link
            href="/shop"
            className="px-4 py-2 text-sm font-medium text-pokemon-red hover:bg-red-50 rounded-lg transition-all"
          >
            View All →
          </Link>
        </div>
        <CardGrid cards={featuredCards} />
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
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
              className={`rounded-xl p-5 border-2 ${rarity.color} hover:scale-[1.02] transition-all duration-200`}
            >
              <div className="text-2xl mb-2">{rarity.emoji}</div>
              <div className="text-gray-800 font-semibold text-sm">{rarity.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-5 rounded-xl bg-white border border-gray-200">
            <div className="text-3xl">🛡️</div>
            <div>
              <h3 className="text-gray-900 font-semibold text-sm">Authenticity Guaranteed</h3>
              <p className="text-gray-500 text-xs mt-0.5">Every card verified before listing</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-xl bg-white border border-gray-200">
            <div className="text-3xl">📦</div>
            <div>
              <h3 className="text-gray-900 font-semibold text-sm">Secure Packaging</h3>
              <p className="text-gray-500 text-xs mt-0.5">Sleeves and top loaders included</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-xl bg-white border border-gray-200">
            <div className="text-3xl">📦</div>
            <div>
              <h3 className="text-gray-900 font-semibold text-sm">Free Shipping</h3>
              <p className="text-gray-500 text-xs mt-0.5">Free on orders over $200</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
