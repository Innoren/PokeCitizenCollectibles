'use client';

import { useCartStore } from '@/store/cart';
import CartItem from '@/components/CartItem';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { items, getTotalPrice, clearCart } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-32 bg-gray-800 rounded" />
          <div className="h-32 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="text-3xl font-bold text-white mb-4">Your Cart is Empty</h1>
        <p className="text-gray-400 mb-8">
          Looks like you haven&apos;t added any cards yet. Start browsing our collection!
        </p>
        <Link
          href="/shop"
          className="inline-flex px-6 py-3 bg-gradient-to-r from-pokemon-yellow to-pokemon-gold text-gray-900 font-bold rounded-xl hover:shadow-lg hover:shadow-pokemon-yellow/25 transition-all"
        >
          Browse Cards
        </Link>
      </div>
    );
  }

  const totalPrice = getTotalPrice();
  const shippingFree = totalPrice >= 200;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>

      {/* Order Summary */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span className="text-white">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Shipping</span>
            <span className={shippingFree ? 'text-green-400' : 'text-white'}>
              {shippingFree ? 'FREE' : '$4.99'}
            </span>
          </div>
          {!shippingFree && (
            <p className="text-sm text-gray-500">
              Add {formatPrice(200 - totalPrice)} more for free shipping
            </p>
          )}
          <div className="border-t border-gray-700/50 pt-3 flex justify-between">
            <span className="text-white font-semibold">Total</span>
            <span className="text-xl font-bold bg-gradient-to-r from-pokemon-yellow to-pokemon-gold bg-clip-text text-transparent">
              {formatPrice(totalPrice + (shippingFree ? 0 : 4.99))}
            </span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="block w-full py-4 text-center bg-gradient-to-r from-pokemon-yellow to-pokemon-gold text-gray-900 font-bold rounded-xl hover:shadow-lg hover:shadow-pokemon-yellow/25 transition-all hover:scale-[1.01]"
        >
          Proceed to Checkout
        </Link>

        <Link
          href="/shop"
          className="block w-full py-3 text-center text-gray-400 hover:text-white transition-colors mt-3"
        >
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
}
