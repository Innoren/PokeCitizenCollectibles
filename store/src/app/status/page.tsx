'use client';

import { useEffect, useState } from 'react';

interface StatusData {
  status: string;
  timestamp: string;
  responseTime: string;
  database: string;
  uptime: string;
  error?: string;
  stats?: {
    totalCards: number;
    totalOrders: number;
    totalRevenue: string;
  };
  recentOrders?: {
    id: number;
    customer: string;
    total: string;
    status: string;
    date: string;
  }[];
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [history, setHistory] = useState<{ time: string; ok: boolean }[]>([]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
      setHistory((prev) => [
        { time: new Date().toLocaleTimeString(), ok: json.status === 'healthy' },
        ...prev.slice(0, 19),
      ]);
    } catch {
      setData({
        status: 'unreachable',
        timestamp: new Date().toISOString(),
        responseTime: '-',
        database: 'unknown',
        uptime: '-',
        error: 'Could not reach the server',
      });
      setHistory((prev) => [
        { time: new Date().toLocaleTimeString(), ok: false },
        ...prev.slice(0, 19),
      ]);
    }
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = data?.status === 'healthy';

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 font-sans">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-pokemon-red" />
            </div>
            <h1 className="text-base font-semibold text-white">PokeCitizen Monitor</h1>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Status banner */}
        <div className={`rounded-2xl p-5 mb-4 border ${
          isHealthy
            ? 'bg-emerald-950/50 border-emerald-800/50'
            : 'bg-red-950/50 border-red-800/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3.5 h-3.5 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {isHealthy && (
                <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
              )}
            </div>
            <div>
              <p className={`font-semibold ${isHealthy ? 'text-emerald-300' : 'text-red-300'}`}>
                {isHealthy ? 'All Systems Operational' : 'Issues Detected'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {lastRefresh.toLocaleTimeString()} • refreshes every 30s
              </p>
            </div>
          </div>
          {data?.error && (
            <p className="mt-3 text-xs text-red-300 bg-red-900/30 rounded-lg p-2 border border-red-800/30">
              {data.error}
            </p>
          )}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Response</p>
            <p className="text-xl font-bold text-white mt-1">{data?.responseTime || '-'}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Database</p>
            <p className={`text-xl font-bold mt-1 ${
              data?.database === 'connected' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {data?.database === 'connected' ? '● Online' : '● Offline'}
            </p>
          </div>
        </div>

        {/* Store stats */}
        {data?.stats && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 mb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Store Overview</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{data.stats.totalCards}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Cards</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{data.stats.totalOrders}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-400">${data.stats.totalRevenue}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Revenue</p>
              </div>
            </div>
          </div>
        )}

        {/* Uptime history bar */}
        {history.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 mb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Check History</p>
            <div className="flex gap-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 h-6 rounded-sm ${h.ok ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
                  title={`${h.time}: ${h.ok ? 'OK' : 'FAIL'}`}
                />
              ))}
              {/* Fill remaining slots */}
              {Array.from({ length: Math.max(0, 20 - history.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex-1 h-6 rounded-sm bg-gray-700/30" />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-gray-600">newest</span>
              <span className="text-[9px] text-gray-600">oldest</span>
            </div>
          </div>
        )}

        {/* Recent orders */}
        {data?.recentOrders && data.recentOrders.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 mb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Recent Orders</p>
            <div className="space-y-2.5">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{order.customer}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(order.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">${order.total}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      order.status === 'completed'
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : order.status === 'pending'
                        ? 'bg-yellow-900/50 text-yellow-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-600 mt-6">
          Add to Home Screen for app-like experience
        </p>
      </div>
    </div>
  );
}
