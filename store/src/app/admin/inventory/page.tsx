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
  const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [priceValue, setPriceValue] = useState('');

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

  // Set stock to an exact value (used by +/- steppers and direct input)
  const setStock = async (id: number, newStock: number) => {
    if (isNaN(newStock) || newStock < 0) return;
    // Optimistic update
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stock: newStock } : c)));
    setSavingId(id);
    try {
      await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock: newStock }),
      });
    } catch {
      alert('Failed to update stock');
      loadInventory();
    }
    setSavingId(null);
  };

  const savePrice = async (id: number) => {
    const newPrice = parseFloat(priceValue);
    if (isNaN(newPrice) || newPrice <= 0) { setEditingPrice(null); return; }
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, price: newPrice.toFixed(2) } : c)));
    setEditingPrice(null);
    try {
      await fetch('/api/admin/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price: newPrice.toFixed(2) }),
      });
    } catch {
      alert('Failed to update price');
      loadInventory();
    }
  };

  const matchesSearch = (c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.setName.toLowerCase().includes(search.toLowerCase()) ||
    (c.sku || '').toLowerCase().includes(search.toLowerCase());

  const matchesStatus = (c: any) =>
    statusFilter === 'all' ? true :
    statusFilter === 'out' ? c.stock === 0 :
    statusFilter === 'low' ? c.stock > 0 && c.stock <= 3 :
    c.stock > 3;

  const filtered = cards.filter((c) => matchesSearch(c) && matchesStatus(c));

  // Counts for filter chips
  const counts = {
    all: cards.length,
    in: cards.filter((c) => c.stock > 3).length,
    low: cards.filter((c) => c.stock > 0 && c.stock <= 3).length,
    out: cards.filter((c) => c.stock === 0).length,
  };

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
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, set, or SKU..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none"
              />
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {([
              { key: 'all', label: 'All Products' },
              { key: 'in', label: 'In Stock' },
              { key: 'low', label: 'Low Stock' },
              { key: 'out', label: 'Out of Stock' },
            ] as const).map((chip) => {
              const active = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(chip.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? 'bg-pokemon-red text-white border-pokemon-red'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {chip.label}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                    active ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {counts[chip.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Product cards */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
              <p className="text-lg">{cards.length === 0 ? 'No products yet.' : 'No matches found.'}</p>
              <p className="text-sm mt-1">
                {cards.length === 0 ? 'Add your first product using the Add Product tab.' : 'Try a different search or filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((card) => {
                const stockColor =
                  card.stock === 0 ? 'text-red-600' :
                  card.stock <= 3 ? 'text-orange-600' : 'text-green-600';
                const stockLabel =
                  card.stock === 0 ? 'Out of stock' :
                  card.stock <= 3 ? 'Low stock' : 'In stock';
                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                      {card.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span className="text-gray-300 text-xl">🎴</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{card.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {card.setName} · {card.rarity}
                        {card.sku && <span className="text-gray-300 font-mono ml-1">· {card.sku}</span>}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${stockColor}`}>● {stockLabel}</p>
                    </div>

                    {/* Price (inline editable) */}
                    <div className="shrink-0 text-right w-20">
                      {editingPrice === card.id ? (
                        <input
                          type="number"
                          value={priceValue}
                          onChange={(e) => setPriceValue(e.target.value)}
                          onBlur={() => savePrice(card.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') savePrice(card.id); }}
                          autoFocus
                          min="0.01"
                          step="0.01"
                          className="w-20 px-2 py-1 border border-pokemon-red rounded-lg text-right outline-none text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingPrice(card.id); setPriceValue(card.price); }}
                          className="font-bold text-gray-900 hover:text-pokemon-red transition-colors"
                          title="Click to edit price"
                        >
                          ${card.price}
                        </button>
                      )}
                    </div>

                    {/* Stock stepper */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        onClick={() => setStock(card.id, Math.max(0, card.stock - 1))}
                        disabled={card.stock === 0}
                        className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Decrease stock"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={card.stock}
                        min="0"
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, stock: isNaN(v) ? 0 : v } : c));
                        }}
                        onBlur={(e) => setStock(card.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className={`w-14 h-8 border rounded-lg text-center outline-none text-sm font-semibold ${
                          savingId === card.id ? 'border-pokemon-red' : 'border-gray-200'
                        } focus:border-pokemon-red`}
                      />
                      <button
                        onClick={() => setStock(card.id, card.stock + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors flex items-center justify-center"
                        title="Increase stock"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                      title="Delete product"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Use − / + to adjust stock instantly, or type a number. Click a price to edit it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
