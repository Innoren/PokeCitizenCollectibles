'use client';

import { useState, useEffect } from 'react';

interface ProductForm {
  sku: string;
  productType: string;
  name: string;
  setName: string;
  rarity: string;
  condition: string;
  price: string;
  imageUrl: string;
  description: string;
  stock: string;
}

const EMPTY_FORM: ProductForm = {
  sku: '',
  productType: 'Single Card',
  name: '',
  setName: '',
  rarity: 'Common',
  condition: 'Near Mint',
  price: '',
  imageUrl: '',
  description: '',
  stock: '1',
};

const PRODUCT_TYPES = ['Single Card', 'Booster Pack', 'Elite Trainer Box', 'Booster Box', 'Collection Box', 'Tin', 'Blister Pack', 'Bundle', 'Other'];
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Sealed Product'];
const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Factory Sealed'];

export default function InventoryPage() {
  const [tab, setTab] = useState<'add' | 'manage'>('add');
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');

  const [cards, setCards] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [priceValue, setPriceValue] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [globalMarkup, setGlobalMarkup] = useState('10');
  const [progress, setProgress] = useState<{ processed: number; total: number; updated: number; skipped: number; eta: string } | null>(null);
  const [syncDetails, setSyncDetails] = useState<Array<{ id: number; name: string; status: string; reason?: string; oldPrice?: string; newPrice?: string; marketPrice?: number }>>([]);
  const [showReport, setShowReport] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'productType' && value !== 'Single Card') {
        updated.rarity = 'Sealed Product';
        updated.condition = 'Factory Sealed';
      }
      return updated;
    });
  };

  const handleLookup = async () => {
    if (!form.sku.trim()) {
      setLookupMessage('Enter a SKU first (e.g. swsh3-20)');
      return;
    }
    setLookupLoading(true);
    setLookupMessage('');
    try {
      const res = await fetch(`/api/admin/lookup?sku=${encodeURIComponent(form.sku.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupMessage(data.error || 'Card not found');
        setLookupLoading(false);
        return;
      }
      setForm((prev) => ({
        ...prev,
        sku: data.card.sku || prev.sku,
        name: data.card.name || prev.name,
        setName: data.card.setName || prev.setName,
        rarity: data.card.rarity || prev.rarity,
        imageUrl: data.card.imageUrl || prev.imageUrl,
        description: data.card.description || prev.description,
        price: data.card.suggestedPrice ? String(data.card.suggestedPrice) : prev.price,
      }));
      setLookupMessage(`✓ Found: ${data.card.name}${data.card.suggestedPrice ? ` (TCGPlayer market ~$${data.card.suggestedPrice})` : ''}`);
    } catch {
      setLookupMessage('Lookup failed. Enter details manually.');
    }
    setLookupLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: form.sku || null,
          name: form.name,
          setName: form.setName,
          rarity: form.rarity,
          condition: form.condition,
          price: form.price,
          imageUrl: form.imageUrl,
          description: form.description,
          stock: parseInt(form.stock, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add product');
      }
      setStatus('success');
      setMessage(`"${form.name}" added successfully!`);
      setForm(EMPTY_FORM);
      setLookupMessage('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    }
  };

  const loadInventory = async () => {
    try {
      const res = await fetch('/api/cards?limit=1000');
      const data = await res.json();
      setCards(data.cards || []);
    } catch {
      setMessage('Failed to load inventory');
    }
  };

  useEffect(() => {
    if (tab === 'manage') loadInventory();
  }, [tab]);

  const deleteCard = async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/cards?id=${id}`, { method: 'DELETE' });
      if (res.ok) setCards(cards.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete');
    }
  };

  const saveStock = async (id: number) => {
    const newStock = parseInt(stockValue, 10);
    if (isNaN(newStock) || newStock < 0) { setEditingStock(null); return; }
    try {
      await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock: newStock }),
      });
      setCards(cards.map((c) => (c.id === id ? { ...c, stock: newStock } : c)));
    } catch {
      alert('Failed to update stock');
    }
    setEditingStock(null);
  };

  const savePrice = async (id: number) => {
    const newPrice = parseFloat(priceValue);
    if (isNaN(newPrice) || newPrice <= 0) { setEditingPrice(null); return; }
    const formatted = newPrice.toFixed(2);
    try {
      await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price: formatted }),
      });
      setCards(cards.map((c) => (c.id === id ? { ...c, price: formatted } : c)));
    } catch {
      alert('Failed to update price');
    }
    setEditingPrice(null);
  };

  const formatEta = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return 'calculating...';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m > 0) return `~${m}m ${s}s left`;
    return `~${s}s left`;
  };

  const syncAllPrices = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncDetails([]);
    setShowReport(false);
    setProgress({ processed: 0, total: cards.length || 0, updated: 0, skipped: 0, eta: 'calculating...' });
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let offset = 0;
    let hasMore = true;
    const startTime = Date.now();
    const allDetails: Array<{ id: number; name: string; status: string; reason?: string; oldPrice?: string; newPrice?: string; marketPrice?: number }> = [];

    const markupVal = parseFloat(globalMarkup);
    const markupParam = !isNaN(markupVal) ? `&markup=${markupVal}` : '';

    try {
      while (hasMore) {
        const res = await fetch(`/api/admin/auto-price?batch=12&offset=${offset}${markupParam}`);
        if (!res.ok) {
          const text = await res.text();
          let errMsg = 'Sync failed';
          try { errMsg = JSON.parse(text).error || errMsg; } catch { errMsg = `Server error (${res.status})`; }
          throw new Error(errMsg);
        }
        const data = await res.json();
        totalUpdated += data.updated || 0;
        totalFailed += data.failed || 0;
        totalSkipped += data.skipped || 0;
        if (Array.isArray(data.details)) allDetails.push(...data.details);
        hasMore = data.hasMore;
        const processed = Math.min(data.nextOffset || offset + 12, data.total);
        offset = data.nextOffset || offset + 12;

        // Estimate time remaining from average speed so far
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed; // cards per second
        const remaining = data.total - processed;
        const eta = rate > 0 ? formatEta(remaining / rate) : 'calculating...';

        setProgress({ processed, total: data.total, updated: totalUpdated, skipped: totalSkipped, eta });
      }
      setProgress(null);
      setSyncDetails(allDetails);
      setShowReport(true);
      setSyncResult(`✓ Done! Updated ${totalUpdated} products at ${!isNaN(markupVal) ? markupVal : 10}% markup. ${totalSkipped > 0 ? `${totalSkipped} skipped.` : ''} ${totalFailed > 0 ? `${totalFailed} failed.` : ''}`);
      loadInventory();
    } catch (err: any) {
      setProgress(null);
      setSyncDetails(allDetails);
      if (allDetails.length > 0) setShowReport(true);
      setSyncResult(`✗ ${err.message || 'Sync failed'} (${totalUpdated} updated before error)`);
    }
    setSyncing(false);
  };

  const filtered = cards.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.setName.toLowerCase().includes(search.toLowerCase()) ||
    (c.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-6 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-500 mt-1">Add new products and manage existing stock</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('add')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === 'add' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Add Product
        </button>
        <button
          onClick={() => setTab('manage')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === 'manage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Manage Stock
        </button>
      </div>

      {/* ADD TAB */}
      {tab === 'add' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {/* SKU lookup */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-medium text-blue-800 mb-2">📷 Quick Add — enter a SKU to auto-fill</p>
            <div className="flex gap-2">
              <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                placeholder="e.g. swsh3-20, sv1-25"
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {lookupLoading ? 'Looking up…' : 'Look Up'}
              </button>
            </div>
            {lookupMessage && (
              <p className={`text-xs mt-2 ${lookupMessage.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                {lookupMessage}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
              <select name="productType" value={form.productType} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none">
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Card ID</label>
              <input type="text" name="sku" value={form.sku} onChange={handleChange}
                placeholder="Optional"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none bg-gray-50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required
                placeholder={form.productType === 'Single Card' ? 'e.g. Charizard VMAX' : 'e.g. Scarlet & Violet ETB'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set / Product Line *</label>
              <input type="text" name="setName" value={form.setName} onChange={handleChange} required
                placeholder={form.productType === 'Single Card' ? 'e.g. Darkness Ablaze' : 'e.g. Scarlet & Violet'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rarity *</label>
              <select name="rarity" value={form.rarity} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none">
                {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
              <select name="condition" value={form.condition} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} required min="0.01" step="0.01"
                placeholder="29.99"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
              <input type="number" name="stock" value={form.stock} onChange={handleChange} required min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Image *</label>
              <div className="flex items-center gap-3 mb-3">
                <label className="flex-shrink-0 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                  📷 Upload Image
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setStatus('loading');
                      const fd = new FormData();
                      fd.append('file', file);
                      try {
                        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);
                        setForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
                        setStatus('idle');
                      } catch (err: any) {
                        setStatus('error');
                        setMessage(err.message || 'Upload failed');
                      }
                    }} />
                </label>
                <span className="text-xs text-gray-400">JPG, PNG, WebP, GIF — max 10MB</span>
              </div>
              <input type="text" name="imageUrl" value={form.imageUrl} onChange={handleChange} required
                placeholder="Or paste an image URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                placeholder="Optional details about condition, centering, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none resize-none" />
            </div>
          </div>

          {form.imageUrl && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <img src={form.imageUrl} alt="Preview" className="h-40 object-contain rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
              status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : ''
            }`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={status === 'loading'}
            className="mt-6 w-full py-3 bg-pokemon-red text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
            {status === 'loading' ? 'Adding…' : 'Add Product to Store'}
          </button>
        </form>
      )}

      {/* MANAGE TAB */}
      {tab === 'manage' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, set, or SKU..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-500">Markup</span>
                <input
                  type="number"
                  value={globalMarkup}
                  onChange={(e) => setGlobalMarkup(e.target.value)}
                  min="0"
                  max="500"
                  step="1"
                  className="w-14 text-center text-sm font-semibold text-gray-900 outline-none"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <button
                onClick={syncAllPrices}
                disabled={syncing}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
              >
                {syncing
                  ? progress
                    ? `⏳ ${progress.processed}/${progress.total}`
                    : '⏳ Syncing...'
                  : '💰 Update All Prices'}
              </button>
            </div>
          </div>

          {/* Live progress bar */}
          {progress && (
            <div className="mb-4 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">
                  Updating prices… {progress.processed} / {progress.total}
                </span>
                <span className="text-sm font-medium text-gray-500">{progress.eta}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0}% complete</span>
                <span className="text-green-600 font-medium">✓ {progress.updated} updated</span>
                {progress.skipped > 0 && <span className="text-gray-400">⊘ {progress.skipped} skipped</span>}
              </div>
            </div>
          )}

          {syncResult && (
            <div className={`mb-2 p-3 rounded-lg text-sm font-medium ${
              syncResult.startsWith('✓')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {syncResult}
              {syncDetails.length > 0 && (
                <button
                  onClick={() => setShowReport((s) => !s)}
                  className="ml-2 underline font-normal hover:no-underline"
                >
                  {showReport ? 'Hide report' : 'View report'}
                </button>
              )}
            </div>
          )}

          {/* Detailed sync report */}
          {showReport && syncDetails.length > 0 && (
            <div className="mb-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Product</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-600">Status</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Price change</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Updated first, then skipped, then failed */}
                    {[...syncDetails]
                      .sort((a, b) => {
                        const order: Record<string, number> = { updated: 0, skipped: 1, failed: 2 };
                        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                      })
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-900">{d.name}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              d.status === 'updated' ? 'bg-green-100 text-green-700' :
                              d.status === 'skipped' ? 'bg-gray-100 text-gray-600' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {d.status === 'updated' ? '✓ Updated' : d.status === 'skipped' ? '⊘ Skipped' : '✗ Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">
                            {d.status === 'updated' && d.oldPrice && d.newPrice ? (
                              <span>
                                <span className="text-gray-400 line-through">${d.oldPrice}</span>
                                {' → '}
                                <span className="font-semibold text-gray-900">${d.newPrice}</span>
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {d.status === 'updated'
                              ? `Market: $${d.marketPrice?.toFixed(2)}`
                              : d.reason || ''}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg">{cards.length === 0 ? 'No products yet.' : 'No matches found.'}</p>
                <p className="text-sm mt-1">
                  {cards.length === 0 ? 'Add your first product using the Add Product tab.' : 'Try a different search.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Set</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Rarity</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((card) => (
                      <tr key={card.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{card.name}</p>
                          {card.sku && <p className="text-[10px] text-gray-400 font-mono">{card.sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{card.setName}</td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{card.rarity}</td>
                        <td className="px-4 py-3 text-right">
                          {editingPrice === card.id ? (
                            <div className="flex items-center justify-end gap-0.5">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                value={priceValue}
                                onChange={(e) => setPriceValue(e.target.value)}
                                onBlur={() => savePrice(card.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') savePrice(card.id); if (e.key === 'Escape') setEditingPrice(null); }}
                                autoFocus
                                min="0.01"
                                step="0.01"
                                className="w-20 px-2 py-1 border border-pokemon-red rounded text-right outline-none"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingPrice(card.id); setPriceValue(String(card.price)); }}
                              className="text-gray-900 font-medium hover:ring-2 hover:ring-pokemon-red/30 rounded px-2 py-1"
                              title="Click to edit price"
                            >
                              ${card.price}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingStock === card.id ? (
                            <input
                              type="number"
                              value={stockValue}
                              onChange={(e) => setStockValue(e.target.value)}
                              onBlur={() => saveStock(card.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveStock(card.id); }}
                              autoFocus
                              min="0"
                              className="w-16 px-2 py-1 border border-pokemon-red rounded text-center outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingStock(card.id); setStockValue(String(card.stock)); }}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                card.stock === 0 ? 'bg-red-100 text-red-700' :
                                card.stock <= 3 ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              } hover:ring-2 hover:ring-pokemon-red/30`}
                              title="Click to edit"
                            >
                              {card.stock}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteCard(card.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {filtered.length > 0 && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Tip: click any price or stock number to edit it inline
            </p>
          )}
        </div>
      )}
    </div>
  );
}
