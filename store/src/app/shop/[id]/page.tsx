import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatPrice, getRarityColor, getConditionColor } from '@/lib/utils';
import AddToCartButton from './AddToCartButton';
import ZoomableImage from '@/components/ZoomableImage';
import AdminEditButton from '@/components/AdminEditButton';

export const dynamic = 'force-dynamic';

interface CardDetailPageProps {
  params: { id: string };
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const cardId = parseInt(params.id, 10);

  if (isNaN(cardId)) {
    notFound();
  }

  const result = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  const card = result[0];

  if (!card) {
    notFound();
  }

  // Build TCGPlayer search link
  const tcgPlayerUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name)}&view=grid`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-gray-900 transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-gray-700">{card.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Card Image */}
        <div className="relative">
          <div className="sticky top-24">
            <div className="relative aspect-square max-w-lg mx-auto rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 p-4">
              <ZoomableImage src={card.imageUrl} alt={card.name} />
              {card.stock === 0 && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <span className="px-8 py-4 bg-red-600 text-white text-xl font-bold rounded-xl shadow-lg uppercase tracking-wide">Out of Stock</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div className="space-y-6">
          {/* Title & Set */}
          <div>
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border mb-4 ${getRarityColor(card.rarity)}`}>
              {card.rarity}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {card.name}
            </h1>
            <p className="text-gray-500 text-lg">{card.setName}</p>
            {card.sku && (
              <p className="text-xs text-gray-400 mt-1 font-mono">SKU: {card.sku}</p>
            )}
          </div>

          {/* Price */}
          <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-pokemon-red">
              {formatPrice(card.price)}
            </div>
            <p className="text-gray-500 text-sm mt-1">+ Free shipping on orders over $50</p>
          </div>

          {/* TCGPlayer Price Reference */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">📊 Compare on TCGPlayer</p>
                <p className="text-xs text-blue-600 mt-0.5">Check current market prices and recent sales</p>
              </div>
              <a
                href={tcgPlayerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                View on TCGPlayer ↗
              </a>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-gray-200">
              <p className="text-gray-500 text-sm mb-1">Condition</p>
              <p className={`font-semibold ${getConditionColor(card.condition)}`}>
                {card.condition}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-gray-200">
              <p className="text-gray-500 text-sm mb-1">Stock</p>
              <p className={`font-semibold ${card.stock <= 3 ? 'text-red-500' : 'text-green-600'}`}>
                {card.stock > 0 ? `${card.stock} available` : 'Out of stock'}
              </p>
            </div>
          </div>

          {/* Description */}
          {card.description && (
            <div>
              <h3 className="text-gray-900 font-semibold mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{card.description}</p>
            </div>
          )}

          {/* Add to Cart */}
          <AddToCartButton card={card} />

          {/* Admin quick edit */}
          <AdminEditButton cardId={card.id} currentImageUrl={card.imageUrl} />

          {/* Trust badges */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>🛡️</span> Authenticity Guaranteed
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>📦</span> Secure Packaging
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
