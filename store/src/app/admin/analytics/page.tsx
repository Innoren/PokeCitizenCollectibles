'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  period: string;
  summary: {
    totalOrders: number;
    totalRevenue: string;
    averageOrder: string;
  };
  timeline: { label: string; orders: number; revenue: string }[];
  topItems: { name: string; set_name: string; units_sold: number; total_revenue: string }[];
  recentOrders: { id: number; customer: string; email: string; total: string; status: string; date: string }[];
}

const PERIODS = [
  { key: '1h', label: '1 Hour' },
  { key: '1d', label: '1 Day' },
  { key: '1w', label: '1 Week' },
  { key: '1m', label: '1 Month' },
  { key: '3m', label: '3 Months' },
  { key: '1y', label: '1 Year' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('1d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async (p: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(period);
  }, [period]);

  // Find max revenue for chart scaling
  const maxRevenue = data?.timeline?.length
    ? Math.max(...data.timeline.map((t) => parseFloat(t.revenue) || 0), 1)
    : 1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-500 mt-1">Track your store performance</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            ← Inventory
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            Store
          </Link>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              period === p.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading analytics...</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.summary.totalOrders}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-2">${data.summary.totalRevenue}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${data.summary.averageOrder}</p>
            </div>
          </div>

          {/* Revenue chart (bar chart) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Revenue Over Time</h2>
            {data.timeline.length > 0 ? (
              <div className="flex items-end gap-1 h-48">
                {data.timeline.map((point, i) => {
                  const height = (parseFloat(point.revenue) / maxRevenue) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                        <p className="font-medium">${parseFloat(point.revenue).toFixed(2)}</p>
                        <p className="text-gray-300">{point.orders} orders</p>
                        <p className="text-gray-400">{point.label}</p>
                      </div>
                      {/* Bar */}
                      <div
                        className="w-full bg-pokemon-red/80 rounded-t hover:bg-pokemon-red transition-colors min-h-[2px]"
                        style={{ height: `${Math.max(height, 1)}%` }}
                      />
                      {/* Label */}
                      {data.timeline.length <= 14 && (
                        <p className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">
                          {point.label}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No sales data for this period
              </div>
            )}
          </div>

          {/* Two-column: Top items + Recent orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top selling items */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Selling Items</h2>
              {data.topItems.length > 0 ? (
                <div className="space-y-3">
                  {data.topItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.set_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{item.units_sold} sold</p>
                        <p className="text-xs text-green-600">${parseFloat(item.total_revenue).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No sales yet</p>
              )}
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Orders</h2>
              {data.recentOrders.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {data.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">${order.total}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
