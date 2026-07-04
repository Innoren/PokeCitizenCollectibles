'use client';

import { useState, useEffect } from 'react';

interface PriceCard {
  id: number;
  name: string;
  sku: string | null;
  yourPrice: string;
  marketPrice: number | null;
  difference: string;
  status: 'above' | 'below' | 'fair';
  autoPrice: boolean;
  priceMarkup: string;
  lastPriceSync: string | null;
}

export default function PricingPage() {
  const [cards, setCards] = useState<PriceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');
  const [syncResult, setSyncResult] = useState<{ updated: number; failed: number } | null>(null);
  const [globalMarkup, setGlobalMarkup] = useState('10');
  const [editingMarkup, setEditingMarkup] = useState<number | null>(null);
  const [markupValue, setMarkupValue] = useState('');
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [priceValue, setPriceValue] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/price-check');
      const data = await res.json();

      // Also fetch card details for auto-price info
      const cardsRes = await fetch('/api/cards?limit=1000');
      const cardsData = await cardsRes.json();
      const cardMap = new Map(
        (cardsData.cards || []).map((c: any) => [c.id, c])
      );

      const enrichedAlerts: PriceCard[] = (data.alerts || []).map((alert: any) => {
        const card = cardMap.get(alert.id) as any;
        return {
          ...alert,
          autoPrice: card?.autoPrice ?? false,
          priceMarkup: card?.priceMarkup ?? '10.00',
          lastPriceSync: card?.lastPriceSync ?? null,
        };
      });

      setCards(enrichedAlerts);
      setCheckedAt(data.checkedAt || '');
    } catch {
      // silent fail
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const syncAutoPrices = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/auto-price');
      const data = await res.json();
      setSyncResult({ updated: data.updated, failed: data.failed });
      // Refresh the price list
      await fetchPrices();
    } catch {
      setSyncResult({ updated: 0, failed: -1 });
    }
    setSyncing(false);
  };

  const toggleAutoPrice = async (id: number, enabled: boolean) => {
    setUpdating(id);
    try {
      await fetch('/api/admin/auto-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, autoPrice: enabled }),
      });
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, autoPrice: enabled } : c))
      );
    } catch {
      alert('Failed to update');
    }
    setUpdating(null);
  };

  const saveMarkup = async (id: number) => {
    const val = parseFloat(markupValue);
    if (isNaN(val)) { setEditingMarkup(null); return; }
    try {
      await fetch('/api/admin/auto-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, priceMarkup: val }),
      });
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, priceMarkup: val.toFixed(2) } : c))
      );
    } catch {
      alert('Failed to update markup');
    }
    setEditingMarkup(null);
  };

  const setManualPrice = async (id: number) => {
    const val = parseFloat(priceValue);
    if (isNaN(val) || val <= 0) { setEditingPrice(null); return; }
    try {
      await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price: val.toFixed(2) }),
      });
      // Also disable auto-price when manually setting
      await fetch('/api/admin/auto-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, autoPrice: false }),
      });
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, yourPrice: val.toFixed(2), autoPrice: false, status: 'fair' as const }
            : c
        )
      );
    } catch {
      alert('Failed to update price');
    }
    setEditingPrice(null);
  };

  const matchMarketPrice = async (id: number, marketPrice: number) => {
    setUpdating(id);
    try {
      await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price: marketPrice.toFixed(2) }),
      });
      setCards((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, yourPrice: marketPrice.toFixed(2), status: 'fair' as const, difference: '0.0%' } : a
        )
      );
    } catch {
      alert('Failed to update price');
    }
    setUpdating(null);
  };

  const enableAllAutoPrice = async () => {
    setSyncing(true);
    const markup = parseFloat(globalMarkup) || 10;
    try {
      for (const card of cards) {
        if (!card.autoPrice) {
          await fetch('/api/admin/auto-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: card.id, autoPrice: true, priceMarkup: markup }),
          });
        }
      }
      await fetchPrices();
    } catch {
      alert('Failed to enable auto-pricing for all');
    }
    setSyncing(false);
  };

  const autoCount = cards.filter((c) => c.autoPrice).length;
  const manualCount = cards.filter((c) => !c.autoPrice).length;
  const belowMarket = cards.filter((a) => a.status === 'below');
  const aboveMarket = cards.filter((a) => a.status === 'above');

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-8 md:mt-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pricing</h1>
          <p className="text-gray-500 mt-1">
            Automatic market-based pricing with manual override
          </p>
          {checkedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last market check: {new Date(checkedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPrices}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Checking...' : '↻ Refresh'}
          </button>
          <button
            onClick={syncAutoPrices}
            disabled={syncing || autoCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-pokemon-red rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {syncing ? 'Syncing...' : `⚡ Sync Auto-Prices (${autoCount})`}
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className={`mb-6 p-4 rounded-xl border ${
          syncResult.failed === -1
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {syncResult.failed === -1
            ? 'Sync failed. Check your network connection.'
            : `✓ Synced! ${syncResult.updated} card${syncResult.updated !== 1 ? 's' : ''} updated${syncResult.failed > 0 ? `, ${syncResult.failed} failed` : ''}.`}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          Checking market prices... This may take a moment.
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No cards with SKUs to check.</p>
          <p className="text-sm mt-1">Add SKUs to your cards via Inventory to enable automatic pricing.</p>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{autoCount}</p>
              <p className="text-xs text-blue-600 font-medium">Auto-Priced</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{manualCount}</p>
              <p className="text-xs text-gray-600 font-medium">Manual</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{belowMarket.length}</p>
              <p className="text-xs text-red-600 font-medium">Below Market</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{aboveMarket.length}</p>
              <p className="text-xs text-yellow-600 font-medium">Above Market</p>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">⚡ Bulk Auto-Price</p>
              <p className="text-xs text-blue-600 mt-0.5">Enable automatic pricing for all tracked cards with a global markup</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-blue-700 font-medium">Markup:</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={globalMarkup}
                  onChange={(e) => setGlobalMarkup(e.target.value)}
                  className="w-16 px-2 py-1 border border-blue-300 rounded text-center text-sm"
                  min="-50"
                  max="200"
                  step="1"
                />
                <span className="text-xs text-blue-700">%</span>
              </div>
              <button
                onClick={enableAllAutoPrice}
                disabled={syncing}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Enable All
              </button>
            </div>
          </div>

          {/* Cards table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Card</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Auto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Markup</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Your Price</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Market</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Diff</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cards.map((card) => (
                  <tr key={card.id} className={`hover:bg-gray-50 ${card.autoPrice ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{card.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{card.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAutoPrice(card.id, !card.autoPrice)}
                        disabled={updating === card.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          card.autoPrice ? 'bg-blue-600' : 'bg-gray-300'
                        } ${updating === card.id ? 'opacity-50' : ''}`}
                        title={card.autoPrice ? 'Auto-pricing enabled' : 'Manual pricing'}
                        aria-label={card.autoPrice ? 'Disable auto-pricing' : 'Enable auto-pricing'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                            card.autoPrice ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {card.autoPrice ? (
                        editingMarkup === card.id ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <input
                              type="number"
                              value={markupValue}
                              onChange={(e) => setMarkupValue(e.target.value)}
                              onBlur={() => saveMarkup(card.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveMarkup(card.id); if (e.key === 'Escape') setEditingMarkup(null); }}
                              autoFocus
                              min="-50"
                              max="200"
                              step="1"
                              className="w-14 px-2 py-1 border border-blue-400 rounded text-right text-xs outline-none"
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingMarkup(card.id); setMarkupValue(String(parseFloat(card.priceMarkup))); }}
                            className="text-xs text-blue-600 font-medium hover:ring-2 hover:ring-blue-200 rounded px-2 py-1"
                            title="Click to edit markup"
                          >
                            +{parseFloat(card.priceMarkup).toFixed(0)}%
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingPrice === card.id ? (
                        <div className="flex items-center justify-end gap-0.5">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            value={priceValue}
                            onChange={(e) => setPriceValue(e.target.value)}
                            onBlur={() => setManualPrice(card.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setManualPrice(card.id); if (e.key === 'Escape') setEditingPrice(null); }}
                            autoFocus
                            min="0.01"
                            step="0.01"
                            className="w-20 px-2 py-1 border border-pokemon-red rounded text-right text-xs outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingPrice(card.id); setPriceValue(card.yourPrice); }}
                          className="font-medium text-gray-900 hover:ring-2 hover:ring-pokemon-red/30 rounded px-2 py-1"
                          title="Click to set manual price (disables auto)"
                        >
                          ${card.yourPrice}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {card.marketPrice ? `$${card.marketPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        card.status === 'below'
                          ? 'bg-red-100 text-red-700'
                          : card.status === 'above'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {card.difference}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {card.status !== 'fair' && card.marketPrice && !card.autoPrice && (
                        <button
                          onClick={() => matchMarketPrice(card.id, card.marketPrice!)}
                          disabled={updating === card.id}
                          className="px-2 py-1 text-xs font-medium text-pokemon-red border border-pokemon-red/30 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Match
                        </button>
                      )}
                      {card.autoPrice && (
                        <span className="text-[10px] text-blue-500 font-medium">AUTO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>💡 <strong>Auto</strong> = price updates automatically from TCGPlayer + your markup</span>
            <span>✏️ Click any price to override manually (auto will be disabled)</span>
            <span>⚡ <strong>Sync</strong> = refresh all auto-priced cards now</span>
          </div>
        </>
      )}
    </div>
  );
}
