'use client';

import { useState } from 'react';
import Link from 'next/link';

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

export default function AdminPage() {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-set rarity and condition for sealed products
      if (name === 'productType' && value !== 'Single Card') {
        updated.rarity = 'Sealed Product';
        updated.condition = 'Factory Sealed';
      }
      return updated;
    });
  };

  // SKU lookup — fetches card data from Pokemon TCG API
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

      // Auto-fill the form with looked-up data
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
        throw new Error(data.error || 'Failed to add card');
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
      const res = await fetch('/api/cards?limit=100');
      const data = await res.json();
      setCards(data.cards || []);
      setShowInventory(true);
    } catch {
      setMessage('Failed to load inventory');
    }
  };

  const deleteCard = async (id: number) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    try {
      const res = await fetch(`/api/admin/cards?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCards(cards.filter((c) => c.id !== id));
      }
    } catch {
      alert('Failed to delete card');
    }
  };

  const startEdit = (card: any) => {
    setEditingId(card.id);
    setEditForm({
      sku: card.sku || '',
      name: card.name,
      setName: card.setName,
      rarity: card.rarity,
      condition: card.condition,
      price: card.price,
      imageUrl: card.imageUrl || '',
      description: card.description || '',
      stock: card.stock,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: number) => {
    try {
      const res = await fetch('/api/admin/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm, price: parseFloat(editForm.price), stock: parseInt(editForm.stock, 10) }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update');
        return;
      }
      const data = await res.json();
      setCards(cards.map((c) => (c.id === id ? data.card : c)));
      setEditingId(null);
      setEditForm({});
    } catch {
      alert('Failed to update card');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 mt-1">Add and manage your card inventory</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/analytics"
            className="px-4 py-2 text-sm font-medium text-pokemon-red border border-pokemon-red/30 rounded-lg hover:bg-red-50 transition-all"
          >
            📊 Analytics
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            ← Back to Store
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setShowInventory(false)}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            !showInventory
              ? 'border-pokemon-red text-pokemon-red'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Add New Card
        </button>
        <button
          onClick={loadInventory}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            showInventory
              ? 'border-pokemon-red text-pokemon-red'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          View Inventory
        </button>
      </div>

      {/* Add Card Form */}
      {!showInventory && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          
          {/* SKU Lookup Section */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-medium text-blue-800 mb-2">
              📷 Quick Add — Scan or enter a SKU to auto-fill
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                placeholder="e.g. swsh3-20, sv1-25, base1-4"
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {lookupLoading ? 'Looking up…' : 'Look Up'}
              </button>
            </div>
            {lookupMessage && (
              <p className={`text-xs mt-2 ${lookupMessage.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                {lookupMessage}
              </p>
            )}
            <p className="text-xs text-blue-600 mt-2">
              Search by set code + number (e.g. swsh3-20), card name (e.g. Charizard VMAX), or partial name.
              This is optional — you can fill in everything manually below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
              <select
                name="productType"
                value={form.productType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Selecting anything other than "Single Card" will auto-set rarity to "Sealed Product" and condition to "Factory Sealed"
              </p>
            </div>

            {/* SKU (display/editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Card ID</label>
              <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                placeholder="Optional — auto-filled from lookup"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all bg-gray-50"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder={form.productType === 'Single Card' ? 'e.g. Charizard VMAX' : 'e.g. Scarlet & Violet Elite Trainer Box'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
              />
            </div>

            {/* Set Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set / Product Line *</label>
              <input
                type="text"
                name="setName"
                value={form.setName}
                onChange={handleChange}
                required
                placeholder={form.productType === 'Single Card' ? 'e.g. Darkness Ablaze' : 'e.g. Scarlet & Violet'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
              />
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rarity *</label>
              <select
                name="rarity"
                value={form.rarity}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="29.99"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required
                min="0"
                placeholder="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
              />
            </div>

            {/* Image — URL or Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Image *</label>
              <div className="space-y-3">
                {/* File upload */}
                <div className="flex items-center gap-3">
                  <label className="flex-shrink-0 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                    📷 Upload Image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setMessage('');
                        setStatus('loading');
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          setForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
                          setStatus('idle');
                          setMessage('');
                        } catch (err: any) {
                          setStatus('error');
                          setMessage(err.message || 'Upload failed');
                        }
                      }}
                    />
                  </label>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP, GIF — max 10MB</span>
                </div>
                {/* URL input */}
                <div className="relative">
                  <input
                    type="text"
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={handleChange}
                    required
                    placeholder="Or paste an image URL here"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Upload a photo directly or paste a URL from pokemontcg.io / Imgur / Cloudinary
              </p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Optional description of the card's condition, centering, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokemon-red/20 focus:border-pokemon-red outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Preview */}
          {form.imageUrl && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Image Preview:</p>
              <img
                src={form.imageUrl}
                alt="Preview"
                className="h-48 object-contain rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Status Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
              status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : ''
            }`}>
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-6 w-full py-3 bg-pokemon-red text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Adding Card…' : 'Add Card to Store'}
          </button>
        </form>
      )}

      {/* Inventory View */}
      {showInventory && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {cards.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">No cards in inventory yet.</p>
              <p className="text-sm mt-1">Add your first card using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Card</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Set</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rarity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cards.map((card) => (
                    editingId === card.id ? (
                      <tr key={card.id} className="bg-yellow-50">
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} className="w-full px-2 py-1 border rounded text-xs" placeholder="SKU" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.setName} onChange={(e) => setEditForm({ ...editForm, setName: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.rarity} onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="w-20 px-2 py-1 border rounded text-sm text-right" step="0.01" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className="w-16 px-2 py-1 border rounded text-sm text-right" min="0" />
                        </td>
                        <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => saveEdit(card.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                          <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={card.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">{card.sku || '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{card.name}</td>
                        <td className="px-4 py-3 text-gray-600">{card.setName}</td>
                        <td className="px-4 py-3 text-gray-600">{card.rarity}</td>
                        <td className="px-4 py-3 text-gray-600">{card.condition}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">${card.price}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{card.stock}</td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => startEdit(card)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Edit</button>
                          <button onClick={() => deleteCard(card.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
