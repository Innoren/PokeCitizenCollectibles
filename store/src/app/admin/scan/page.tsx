'use client';

import { useState, useCallback } from 'react';

interface Pair {
  id: number;
  frontPreview: string;
  backPreview: string;
  frontFile: File;
  backFile: File;
}

interface CardRow {
  index: number;
  frontPreview: string;
  backPreview: string;
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error';
  imageUrl: string;
  frontFile: File;
  backFile: File;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  condition: string;
  price: string;
  stock: string;
  include: boolean;
  matchStatus: 'idle' | 'matching' | 'matched' | 'not_found';
  marketPrice: string | null;
}

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Sealed Product'];

export default function ScanPage() {
  const [phase, setPhase] = useState<'idle' | 'pairing' | 'uploading' | 'ready' | 'committed'>('idle');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [rows, setRows] = useState<CardRow[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [markup, setMarkup] = useState('10');
  const [defaultStock, setDefaultStock] = useState('1');
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(0);
  const [matching, setMatching] = useState(false);

  // ═══ PHASE 1: Upload files → auto-pair (every 2 images = front, back) ═══
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length < 2) { alert('Upload at least 2 images (front + back per card).'); return; }

    // Simple: every two consecutive images form a pair (front, back, front, back…).
    const newPairs: Pair[] = [];
    for (let i = 0; i < arr.length - 1; i += 2) {
      newPairs.push({
        id: i / 2,
        frontFile: arr[i],
        backFile: arr[i + 1],
        frontPreview: URL.createObjectURL(arr[i]),
        backPreview: URL.createObjectURL(arr[i + 1]),
      });
    }
    // If odd number, last image is a front with no back — skip or add solo.
    if (arr.length % 2 !== 0) {
      newPairs.push({
        id: newPairs.length,
        frontFile: arr[arr.length - 1],
        backFile: arr[arr.length - 1],
        frontPreview: URL.createObjectURL(arr[arr.length - 1]),
        backPreview: '',
      });
    }
    setPairs(newPairs);
    setPhase('pairing');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, []);

  const flipPair = (id: number) => {
    setPairs((prev) => prev.map((p) => p.id === id ? {
      ...p,
      frontFile: p.backFile, backFile: p.frontFile,
      frontPreview: p.backPreview, backPreview: p.frontPreview,
    } : p));
  };

  const flipAll = () => {
    setPairs((prev) => prev.map((p) => ({
      ...p,
      frontFile: p.backFile, backFile: p.frontFile,
      frontPreview: p.backPreview, backPreview: p.frontPreview,
    })));
  };

  const removePair = (id: number) => {
    setPairs((prev) => prev.filter((p) => p.id !== id));
  };

  // ═══ PHASE 2: Upload fronts (+ backs for reference) ═══
  const startUpload = async () => {
    if (pairs.length === 0) return;
    setPhase('uploading');
    setUploadProgress({ done: 0, total: pairs.length });

    const newRows: CardRow[] = pairs.map((p, i) => ({
      index: i, frontPreview: p.frontPreview, backPreview: p.backPreview,
      uploadStatus: 'pending', imageUrl: '', frontFile: p.frontFile, backFile: p.backFile,
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
          fd.append('file', row.frontFile);
          const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
          if (!res.ok) throw new Error();
          row.imageUrl = (await res.json()).imageUrl;
          row.uploadStatus = 'done';
        } catch {
          row.uploadStatus = 'error';
          row.include = false;
        }
        done++;
        setUploadProgress({ done, total: pairs.length });
        setRows([...newRows]);
      }));
    }
    setPhase('ready');
  };

  // ═══ PHASE 3: Match & edit ═══
  const updateRow = (index: number, field: keyof CardRow, value: any) => {
    setRows((prev) => prev.map((r) => (r.index === index ? { ...r, [field]: value } : r)));
  };

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
      const c = (await res.json()).card;
      const markupVal = parseFloat(markup) || 10;
      setRows((prev) => prev.map((r) => r.index === index ? {
        ...r, name: c.name || r.name, setName: c.setName || r.setName,
        number: c.number || r.number, rarity: c.rarity || r.rarity,
        marketPrice: c.marketPrice,
        price: c.marketPrice ? (parseFloat(c.marketPrice) * (1 + markupVal / 100)).toFixed(2) : r.price,
        matchStatus: c.matched ? 'matched' : 'not_found',
      } : r));
    } catch { updateRow(index, 'matchStatus', 'not_found'); }
  };

  // Quick OCR of just the bottom strip of the card to get the collector number.
  // Much faster than full-card OCR since it's a tiny image region.
  const extractNumber = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Crop the bottom 18% of the image (where collector # lives).
        const cropY = Math.floor(img.height * 0.82);
        const cropH = img.height - cropY;
        canvas.width = img.width;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, cropY, img.width, cropH, 0, 0, img.width, cropH);

        // Convert to text-friendly: high contrast grayscale.
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const bw = gray < 140 ? 0 : 255;
          d[i] = d[i + 1] = d[i + 2] = bw;
        }
        ctx.putImageData(imageData, 0, 0);

        // Use canvas OCR-lite: look for "NNN/NNN" pattern via Tesseract on this tiny strip.
        canvas.toBlob(async (blob) => {
          if (!blob) { resolve(''); return; }
          try {
            const Tesseract = (await import('tesseract.js')).default;
            const { data } = await Tesseract.recognize(blob, 'eng', {
              tessedit_char_whitelist: '0123456789/',
            } as any);
            const text = data.text || '';
            const match = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
            resolve(match ? match[1].replace(/^0+/, '') || '0' : '');
          } catch {
            resolve('');
          }
        }, 'image/png');
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve('');
      img.src = URL.createObjectURL(file);
    });
  };

  const matchAll = async () => {
    setMatching(true);
    const toProcess = rows.filter((r) => r.include && r.matchStatus !== 'matched');

    // First: extract numbers from all fronts via quick OCR (parallel, 4 at a time).
    for (let i = 0; i < toProcess.length; i += 4) {
      const batch = toProcess.slice(i, i + 4);
      await Promise.all(batch.map(async (row) => {
        if (!row.number && !row.name) {
          updateRow(row.index, 'matchStatus', 'matching');
          const num = await extractNumber(row.frontFile);
          if (num) updateRow(row.index, 'number', num);
        }
      }));
    }

    // Then: match all that now have a name or number against the pricing API.
    const toMatch = rows.filter((r) => r.include && (r.name || r.number) && r.matchStatus !== 'matched');
    for (let i = 0; i < toMatch.length; i += 3) {
      await Promise.all(toMatch.slice(i, i + 3).map((r) => matchCard(r.index)));
    }
    setMatching(false);
  };

  const commitAll = async () => {
    setCommitting(true);
    let count = 0;
    for (const r of rows.filter((r) => r.include && r.name && r.price && r.imageUrl)) {
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
      } catch {}
    }
    setCommitted(count);
    setPhase('committed');
    setCommitting(false);
  };

  const reset = () => { setPairs([]); setRows([]); setPhase('idle'); setCommitted(0); };
  const includeCount = rows.filter((r) => r.include && r.name && r.price).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-6 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📷 Bulk Card Upload</h1>
        <p className="text-gray-500 mt-1">Upload front/back JPEGs — they auto-pair. Flip any that are swapped, then identify &amp; price.</p>
      </div>

      {/* ════ IDLE ════ */}
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

          <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-pokemon-red/50 transition-colors">
            <div className="text-5xl mb-3">📁</div>
            <p className="text-lg font-semibold text-gray-700 mb-2">Drop card JPEGs here</p>
            <p className="text-gray-500 text-sm mb-5">Upload in <strong>front, back, front, back…</strong> order</p>
            <label className="cursor-pointer inline-block px-8 py-3 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600 transition-all">
              Choose Files
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden"
                onChange={(e) => handleFiles(e.target.files)} />
            </label>
          </div>
        </div>
      )}

      {/* ════ PAIRING ════ */}
      {phase === 'pairing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Front/Back pairs</p>
              <p className="text-xs text-gray-500">Selected {pairs.length * 2} images</p>
            </div>
            <div className="flex gap-2">
              <button onClick={flipAll} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">🔄 Flip All</button>
              <button onClick={startUpload} className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 text-sm">
                ✓ Continue ({pairs.length} cards)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pairs.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Pair #{p.id + 1}</span>
                  <div className="flex gap-2">
                    <button onClick={() => flipPair(p.id)} className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50">🔄 Flip</button>
                    <button onClick={() => removePair(p.id)} className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50">🗑 Remove</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Front</p>
                    <img src={p.frontPreview} alt="Front" className="w-full aspect-[3/4] object-cover rounded-lg border border-gray-200" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Back</p>
                    {p.backPreview ? (
                      <img src={p.backPreview} alt="Back" className="w-full aspect-[3/4] object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No back</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ UPLOADING ════ */}
      {phase === 'uploading' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900">Uploading… {uploadProgress.done} / {uploadProgress.total}</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-200"
              style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* ════ READY — listing ════ */}
      {phase === 'ready' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{rows.length} cards ready — type name or # to identify</p>
              <p className="text-xs text-gray-500">Press Enter in any row to match. Or fill several and hit "Match All".</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={matchAll} disabled={matching}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {matching ? '⏳ Matching…' : '🔍 Match All'}
              </button>
              <button onClick={commitAll} disabled={committing || includeCount === 0}
                className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50">
                {committing ? '⏳…' : `✓ Add ${includeCount} to Inventory`}
              </button>
              <button onClick={reset} className="px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Reset</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2.5 text-center w-8">✓</th>
                    <th className="px-2 py-2.5 text-left w-16">Front</th>
                    <th className="px-2 py-2.5 text-left w-16">Back</th>
                    <th className="px-2 py-2.5 text-left">Card Name</th>
                    <th className="px-2 py-2.5 text-left w-20">#</th>
                    <th className="px-2 py-2.5 text-left hidden md:table-cell">Set</th>
                    <th className="px-2 py-2.5 text-right w-20">Market</th>
                    <th className="px-2 py-2.5 text-right w-24">Price</th>
                    <th className="px-2 py-2.5 text-center w-14">Qty</th>
                    <th className="px-2 py-2.5 text-left w-28">Condition</th>
                    <th className="px-2 py-2.5 text-left hidden lg:table-cell w-24">Rarity</th>
                    <th className="px-2 py-2.5 text-center w-12">✓</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.index} className={!r.include ? 'opacity-40' : r.matchStatus === 'matched' ? 'bg-green-50/30' : ''}>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={r.include} onChange={(e) => updateRow(r.index, 'include', e.target.checked)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <img src={r.frontPreview} alt="" className="w-12 h-16 object-cover rounded border border-gray-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <img src={r.backPreview} alt="" className="w-12 h-16 object-cover rounded border border-gray-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.name} onChange={(e) => updateRow(r.index, 'name', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') matchCard(r.index); }}
                          placeholder="Type name, Enter"
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
                      <td className="px-2 py-1.5 text-right text-xs text-gray-500">{r.marketPrice ? `$${r.marketPrice}` : '—'}</td>
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
                      <td className="px-2 py-1.5">
                        <select value={r.condition} onChange={(e) => updateRow(r.index, 'condition', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-200 rounded text-xs">
                          <option value="Mint">Mint</option>
                          <option value="Near Mint">Near Mint</option>
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Played">Played</option>
                          <option value="Factory Sealed">Factory Sealed</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 hidden lg:table-cell">
                        <select value={r.rarity} onChange={(e) => updateRow(r.index, 'rarity', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-200 rounded text-xs">
                          {RARITIES.map((x) => <option key={x}>{x}</option>)}
                        </select>
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
        </div>
      )}

      {/* ════ COMMITTED ════ */}
      {phase === 'committed' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Added {committed} card{committed !== 1 ? 's' : ''} to inventory!</h2>
          <p className="text-gray-500 mb-6">They're live in your store.</p>
          <button onClick={reset} className="px-6 py-2.5 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600">Upload more</button>
        </div>
      )}
    </div>
  );
}
