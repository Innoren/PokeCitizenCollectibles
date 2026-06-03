'use client';

import { useCartStore } from '@/store/cart';
import type { Card } from '@/db/schema';
import { useState } from 'react';

interface AddToCartButtonProps {
  card: Card;
}

export default function AddToCartButton({ card }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      id: card.id,
      name: card.name,
      price: card.price,
      imageUrl: card.imageUrl,
      stock: card.stock,
      condition: card.condition,
      rarity: card.rarity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAdd}
      disabled={card.stock === 0}
      className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
        added
          ? 'bg-green-500 text-white'
          : card.stock === 0
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-pokemon-yellow to-pokemon-gold text-gray-900 hover:shadow-lg hover:shadow-pokemon-yellow/25 hover:scale-[1.02]'
      }`}
    >
      {added ? '✓ Added to Cart!' : card.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
    </button>
  );
}
