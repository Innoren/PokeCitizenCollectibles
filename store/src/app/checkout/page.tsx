'use client';

import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { items, getTotalPrice } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
          })),
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Nothing to Checkout</h1>
        <p className="text-gray-500 mb-8">Add some cards to your cart first!</p>
        <Link
          href="/shop"
          className="inline-flex px-6 py-3 bg-pokemon-red text-white font-bold rounded-xl hover:bg-red-600 transition-all"
        >
          Browse Cards
        </Link>
      </div>
    );
  }

  const totalPrice = getTotalPrice();
  const shippingFree = totalPrice >= 200;
  const finalTotal = totalPrice + (shippingFree ? 0 : 4.99);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      {/* Order Review */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Review</h2>

        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.name} × {item.quantity}
              </span>
              <span className="text-gray-900">
                {formatPrice(parseFloat(item.price) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Shipping</span>
            <span className={shippingFree ? 'text-green-600 font-medium' : ''}>
              {shippingFree ? 'FREE' : '$4.99'}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-pokemon-red">
              {formatPrice(finalTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Checkout Button */}
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-4 bg-pokemon-red text-white font-bold rounded-xl hover:bg-red-600 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Pay ${formatPrice(finalTotal)} with Stripe`
          )}
        </button>

        <p className="text-center text-gray-500 text-sm">
          You&apos;ll be redirected to Stripe&apos;s secure checkout page
        </p>

        <Link
          href="/cart"
          className="block text-center text-gray-500 hover:text-gray-900 transition-colors text-sm"
        >
          ← Back to Cart
        </Link>
      </div>
    </div>
  );
}
