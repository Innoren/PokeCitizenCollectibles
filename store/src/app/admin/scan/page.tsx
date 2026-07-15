'use client';

import { useState, useCallback } from 'react';

interface CardRow {
  index: number;
  file: File;
  preview: string;
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error';
  imageUrl: string;
  // Editable
  name: string;
  setName: string;
  number: string;
  rarity: string;
  condition: string;
  price: string;
  stock: string;
  include: boolean;
  // Match state
  matchStatus: 'idle' | 'matching' | 'matched' | 'not_found';
  marketPrice: string | null;
}

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Sealed Product'];

export default function ScanPage() {
  const [rows, setRows] = useState<CardRow[]>([]);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'ready' | 'committed'>('idle');
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [markup, setMarkup] = useState('10');
  const [defaultStock, setDefaultStock] = useState('1');
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(0);
  const [matching, setMatching] = useState(false);

  // Parallel upload (4 at a time for speed)
  const uploadAll = async (files: File[]) => {
    setPhase('uploading');
    const total = files.length;
    setUploadProgress({ done: 0, total });

    const newRows: CardRow[] = files.map((file, i) => ({
      index: i, file, preview: URL.createObjectURL(file),
      uploadStatus: 'pending', imageUrl: '',
      name: '', setName: '', number: '', rarity: 'Rare', condition: 'Near Mint',
      price: '', stock: defaultStock, include: true,
      matchStatus: 'idle', marketPrice: null,
    }));
    setRows(newRows);

    let done = 0;
    const CONCURRENCY = 4;
    for (let i = 0; i < newRows.length; i += CONCURRENCY) {
      const batch = newRows.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (row) => {
        row.uploadStatus = 'uploading';
        setRows([...newRows]);
        try {
          const fd = new FormData();
          fd.append('file', row.file);
          const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          row.imageUrl = data.imageUrl;
          row.uploadStatus = 'done';
        } catch {
          row.uploadStatus = 'error';
          row.include = false;
        }
        done++;
        setUploadProgress({ done, total });
        setRows([...newRows]);
      }));
    }
    setPhase('ready');
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    uploadAll(arr);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, []);

  const updateRow = (index: number, field: keyof CardRow, value: any) => {
    setRows((prev) => prev.map((r) => (r.index === index ? { ...r, [field]: value } : r)));
  };

  // Match a single card by name/number against the TCG API.
  const matchCard = async (index: number) => {
    const row = rows.find((r) => r.index === index);
    if (!row || (!row.name && !row.number)) return;
    updateRow(index, 'matchStatus', 'matching');
    try {
      const res = await fetch('/api/admin/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameGuess: row.name, number: row.number }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const c = data.card;
      const markupVal = parseFloat(markup) || 10;
      setRows((prev) => prev.map((r) => r.index === index ? {
        ...r,
        name: c.name || r.name,
        setName: c.setName || r.setName,
        number: c.number || r.number,
        rarity: c.rarity || r.rarity,
        marketPrice: c.marketPrice,
        price: c.marketPrice ? (parseFloat(c.marketPrice) * (1 + markupVal / 100)).toFixed(2) : r.price,
        matchStatus: c.matched ? 'matched' : 'not_found',
      } : r));
    } catch {
      updateRow(index, 'matchStatus', 'not_found');
    }
  };

  // Match ALL cards that have a name or number filled in.
  const matchAll = async () => {
    setMatching(true);
    const toMatch = rows.filter((r) => r.include && (r.name || r.number) && r.matchStatus !== 'matched');
    const CONCURRENCY = 3;
    for (let i = 0; i < toMatch.length; i += CONCURRENCY) {
      const batch = toMatch.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((r) => matchCard(r.index)));
    }
    setMatching(false);
  };

  const commitAll = async () => {
    setCommitting(true);
    let count = 0;
    const toAdd = rows.filter((r) => r.include && r.name && r.price && r.imageUrl);
    for (const r of toAdd) {
      try {
        const res = await fetch('/api/admin/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: r.name, setName: r.setName || 'Unknown', rarity: r.rarity || 'Rare',
            condition: r.condition, price: r.price, imageUrl: r.imageUrl,
            description: '', stock: parseInt(r.stock, 10) || 1, sku: r.number || null,
          }),
        });
        if (res.ok) count++;
      } catch { /* skip */ }
    }
    setCommitted(count);
    setPhase('committed');
    setCommitting(false);
  };

  const reset = () => { setRows([]); setPhase('idle'); setCommitted(0); };
  const includeCount = rows.filter((r) => r.include && r.name && r.price).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-6 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📷 Bulk Card Upload</h1>
        <p className="text-gray-500 mt-1">
          Drop your JPEG card photos — they upload in parallel, then type name or collector # to auto-match and price. No scan limits, no AI costs.
        </p>
      </div>

      {/* IDLE — drop zone */}
      {phase === 'idle' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-wrap gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Markup %</label>
              <input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" min="0" max="200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Default stock</label>
              <input type="number" value={defaultStock} onChange={(e) => setDefaultStock(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" min="0" />
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-pokemon-red/50 transition-colors"
          >
            <div className="text-5xl mb-3">📁</div>
            <p className="text-lg font-semibold text-gray-700 mb-2">Drop card JPEGs here</p>
            <p className="text-gray-500 text-sm mb-5">or click to browse — upload as many as you want at once</p>
            <label className="cursor-pointer inline-block px-8 py-3 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600 transition-all">
              Choose Files
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden"
                onChange={(e) => handleFiles(e.target.files)} />
            </label>
          </div>
        </div>
      )}

      {/* UPLOADING */}
      {phase === 'uploading' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900">Uploading images… {uploadProgress.done} / {uploadProgress.total}</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-200"
              style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* READY — editable table */}
      {phase === 'ready' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{rows.length} images uploaded — enter name or # to identify</p>
              <p className="text-xs text-gray-500">Type the card name or collector # (e.g. "159"), press Enter or click "Match All". Market price + markup applied automatically.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={matchAll} disabled={matching}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all">
                {matching ? '⏳ Matching…' : '🔍 Match All'}
              </button>
              <button onClick={commitAll} disabled={committing || includeCount === 0}
                className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all">
                {committing ? '⏳ Adding…' : `✓ Add ${includeCount} to Inventory`}
              </button>
              <button onClick={reset} className="px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Reset
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2.5 text-center w-8">✓</th>
                    <th className="px-2 py-2.5 text-left w-16">Photo</th>
                    <th className="px-2 py-2.5 text-left">Card Name</th>
                    <th className="px-2 py-2.5 text-left w-20">#</th>
                    <th className="px-2 py-2.5 text-left hidden md:table-cell">Set</th>
                    <th className="px-2 py-2.5 text-left hidden lg:table-cell w-24">Rarity</th>
                    <th className="px-2 py-2.5 text-right w-20">Market</th>
                    <th className="px-2 py-2.5 text-right w-24">Price</th>
                    <th className="px-2 py-2.5 text-center w-14">Qty</th>
                    <th className="px-2 py-2.5 text-center w-16">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.index} className={!r.include ? 'opacity-40' : r.matchStatus === 'matched' ? 'bg-green-50/30' : ''}>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={r.include} onChange={(e) => updateRow(r.index, 'include', e.target.checked)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <img src={r.preview} alt="" className="w-12 h-16 object-cover rounded border border-gray-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.name} onChange={(e) => updateRow(r.index, 'name', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') matchCard(r.index); }}
                          placeholder="Type name, press Enter"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:border-pokemon-red outline-none" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.number} onChange={(e) => updateRow(r.index, 'number', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') matchCard(r.index); }}
                          placeholder="#"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center focus:border-pokemon-red outline-none" />
                      </td>
                      <td className="px-2 py-1.5 hidden md:table-cell">
                        <input value={r.setName} onChange={(e) => updateRow(r.index, 'setName', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm" placeholder="Auto" />
                      </td>
                      <td className="px-2 py-1.5 hidden lg:table-cell">
                        <select value={r.rarity} onChange={(e) => updateRow(r.index, 'rarity', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-200 rounded text-xs">
                          {RARITIES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right text-xs text-gray-500">
                        {r.marketPrice ? `$${r.marketPrice}` : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <span className="text-gray-400 text-xs">$</span>
                          <input value={r.price} onChange={(e) => updateRow(r.index, 'price', e.target.value)}
                            className="w-16 px-1.5 py-1 border border-gray-200 rounded text-right text-sm" />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input value={r.stock} onChange={(e) => updateRow(r.index, 'stock', e.target.value)}
                          className="w-10 px-1 py-1 border border-gray-200 rounded text-center text-xs" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {r.matchStatus === 'matched' && <span className="text-green-600 text-xs font-medium">✓</span>}
                        {r.matchStatus === 'matching' && <span className="text-blue-500 text-xs animate-pulse">…</span>}
                        {r.matchStatus === 'not_found' && <span className="text-yellow-600 text-xs">⚠</span>}
                        {r.matchStatus === 'idle' && <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            💡 Type a name or collector # in any row and press Enter to instantly match &amp; price. Or fill several and hit "Match All".
          </p>
        </div>
      )}

      {/* COMMITTED */}
      {phase === 'committed' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Added {committed} card{committed !== 1 ? 's' : ''} to inventory!</h2>
          <p className="text-gray-500 mb-6">They're live in your store with market-based pricing.</p>
          <button onClick={reset} className="px-6 py-2.5 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600">
            Upload more cards
          </button>
        </div>
      )}
    </div>
  );
}
