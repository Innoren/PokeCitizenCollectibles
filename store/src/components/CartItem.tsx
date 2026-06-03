'use client';

import Image from 'next/image';
import { useCartStore, type CartItem as CartItemType } from '@/store/cart';
import { formatPrice } from '@/lib/utils';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl">
      {/* Image */}
      <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-contain"
          sizes="80px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold truncate">{item.name}</h3>
        <p className="text-gray-500 text-sm">{item.condition} • {item.rarity}</p>
        <p className="text-pokemon-yellow font-bold mt-1">
          {formatPrice(item.price)}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white transition-all"
        >
          −
        </button>
        <span className="w-8 text-center text-white font-medium">
          {item.quantity}
        </span>
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= item.stock}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* Subtotal & Remove */}
      <div className="text-right">
        <p className="text-white font-bold">
          {formatPrice(parseFloat(item.price) * item.quantity)}
        </p>
        <button
          onClick={() => removeItem(item.id)}
          className="text-red-400 text-sm hover:text-red-300 transition-colors mt-1"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
