'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PriceAlert {
  id: number;
  name: string;
  sku: string | null;
  yourPrice: string;
  marketPrice: number | null;
  difference: string;
  status: 'above' | 'below' | 'fair';
}

export default function PricingPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/price-check');
      const data = await res.json();
      setAlerts(data.alerts || []);
      setCheckedAt(data.checkedAt || '');
    } catch {
      // silent fail
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const updatePrice = async (id: number, newPrice: number) => {
    setUpdating(id);
    try {
      await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price: newPrice.toFixed(2) }),
      });
      // Update local state
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, yourPrice: newPrice.toFixed(2), status: 'fair' as const, difference: '0.0%' } : a
        )
      );
    } catch {
      alert('Failed to update price');
    }
    setUpdating(null);
  };

  const belowMarket = alerts.filter((a) => a.status === 'below');
  const aboveMarket = alerts.filter((a) => a.status === 'above');
  const fairPriced = alerts.filter((a) => a.status === 'fair');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Price Monitor</h1>
          <p className="text-gray-500 mt-1">
            Compare your prices to TCGPlayer market rates
          </p>
          {checkedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last checked: {new Date(checkedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPrices}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-pokemon-red border border-pokemon-red/30 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
          >
            {loading ? 'Checking...' : '↻ Refresh Prices'}
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            ← Inventory
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          Checking market prices... This may take a moment.
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No cards with SKUs to check.</p>
          <p className="text-sm mt-1">Add SKUs to your cards via the admin panel to enable price monitoring.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{belowMarket.length}</p>
              <p className="text-xs text-red-600 font-medium">Below Market</p>
              <p className="text-[10px] text-red-400 mt-0.5">You're leaving money on the table</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{aboveMarket.length}</p>
              <p className="text-xs text-yellow-600 font-medium">Above Market</p>
              <p className="text-[10px] text-yellow-500 mt-0.5">May be hard to sell</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{fairPriced.length}</p>
              <p className="text-xs text-green-600 font-medium">Fair Price</p>
              <p className="text-[10px] text-green-500 mt-0.5">Within ±15% of market</p>
            </div>
          </div>

          {/* Alerts table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Card</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Your Price</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Market Price</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Diff</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{alert.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{alert.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${alert.yourPrice}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ${alert.marketPrice?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        alert.status === 'below'
                          ? 'bg-red-100 text-red-700'
                          : alert.status === 'above'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {alert.difference}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {alert.status !== 'fair' && alert.marketPrice && (
                        <button
                          onClick={() => updatePrice(alert.id, alert.marketPrice!)}
                          disabled={updating === alert.id}
                          className="px-3 py-1 text-xs font-medium text-white bg-pokemon-red rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {updating === alert.id ? '...' : `Set to $${alert.marketPrice.toFixed(2)}`}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
