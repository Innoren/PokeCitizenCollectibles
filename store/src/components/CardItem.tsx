'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, getRarityColor } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import type { Card } from '@/db/schema';

interface CardItemProps {
  card: Card;
}

export default function CardItem({ card }: CardItemProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: card.id,
      name: card.name,
      price: card.price,
      imageUrl: card.imageUrl,
      stock: card.stock,
      condition: card.condition,
      rarity: card.rarity,
    });
  };

  return (
    <Link href={`/shop/${card.id}`} className="group">
      <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative aspect-[2/3] overflow-hidden bg-gray-100 p-3">
          {/* Market Price Badge */}
          {card.lastMarketPrice && (
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">
              MARKET PRICE
            </div>
          )}
          <div className="relative w-full h-full flex items-center justify-center">
            {card.imageUrl ? (
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className="object-contain transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <svg viewBox="0 0 100 100" className="w-16 h-16 opacity-30">
                  <circle cx="50" cy="50" r="48" fill="#EF4444" opacity="0.3" />
                  <path d="M 2 50 A 48 48 0 0 0 98 50 Z" fill="#FFFFFF" />
                  <rect x="2" y="46" width="96" height="8" fill="#1F2937" opacity="0.3" />
                  <circle cx="50" cy="50" r="14" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3" opacity="0.3" />
                </svg>
                <span className="text-xs mt-2">No image</span>
              </div>
            )}
          </div>
          {/* Stock indicator */}
          {card.stock <= 3 && card.stock > 0 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
              Only {card.stock} left
            </div>
          )}
          {card.stock === 0 && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="px-6 py-3 bg-red-600 text-white text-lg font-bold rounded-lg shadow-lg uppercase tracking-wide">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-pokemon-blue uppercase tracking-wide mb-0.5">{card.setName}</p>
          <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-pokemon-red transition-colors line-clamp-1">
            {card.name}
          </h3>

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${getRarityColor(card.rarity)}`}>
              {card.rarity}
            </span>
            <span className="text-xs text-gray-500">{card.condition}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(card.price)}
              </span>
              <p className="text-xs text-green-600 font-medium mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 align-middle" />
                {card.stock} available
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={card.stock === 0}
              className="p-2 bg-pokemon-red text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Add to Cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
