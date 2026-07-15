'use client';

import { useState } from 'react';

type Layout = 'pairs' | 'fronts';

interface Pair {
  front: File;
  back: File | null;
}

interface ScanRow {
  index: number;
  frontPreview: string;
  status: 'pending' | 'reading' | 'matching' | 'done' | 'error';
  error?: string;
  ocrName: string;
  ocrNumber: string;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  variant: string;
  condition: string;
  marketPrice: string | null;
  matched: boolean;
  price: string;
  stock: string;
  include: boolean;
  imageUrl: string;
}

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Sealed Product'];

/** Pull the collector number ("159/086" -> "159") and a name guess from OCR data. */
function parseOcr(data: any): { name: string; number: string } {
  const text: string = data?.text || '';

  // Collector number: e.g. 159/086, 12/165, 045/091
  let number = '';
  const numMatch = text.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if (numMatch) number = numMatch[1].replace(/^0+/, '') || '0';

  // Name guess: the tallest text line in the top third of the card.
  let name = '';
  const lines: any[] = data?.lines || [];
  if (lines.length > 0) {
    const maxY = Math.max(...lines.map((l) => l.bbox?.y1 || 0)) || 1;
    const candidates = lines
      .filter((l) => (l.bbox?.y0 ?? 9999) < maxY * 0.4)
      .map((l) => ({
        text: (l.text || '').replace(/[^A-Za-z0-9'’.\- ]/g, '').trim(),
        height: (l.bbox?.y1 || 0) - (l.bbox?.y0 || 0),
        conf: l.confidence || 0,
      }))
      .filter((l) => l.text.replace(/[^A-Za-z]/g, '').length >= 3 && !/^HP\b/i.test(l.text));
    candidates.sort((a, b) => b.height - a.height);
    if (candidates[0]) {
      // Strip a trailing "HP" and numbers/type noise
      name = candidates[0].text.replace(/\s*\bHP\b.*$/i, '').replace(/\s{2,}/g, ' ').trim();
    }
  }
  return { name, number };
}

export default function ScanPage() {
  const [layout, setLayout] = useState<Layout>('fronts');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [phase, setPhase] = useState<'idle' | 'processing' | 'review'>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [markup, setMarkup] = useState('10');
  const [defaultStock, setDefaultStock] = useState('1');
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<number | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const newPairs: Pair[] = [];
    if (layout === 'pairs') {
      for (let i = 0; i < arr.length; i += 2) newPairs.push({ front: arr[i], back: arr[i + 1] || null });
    } else {
      for (const f of arr) newPairs.push({ front: f, back: null });
    }
    setPairs(newPairs);
  };

  const uploadToBlob = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Image upload failed');
    return (await res.json()).imageUrl;
  };

  const startScanning = async () => {
    if (pairs.length === 0) return;
    setPhase('processing');
    setProgress({ done: 0, total: pairs.length });

    // Lazy-load Tesseract only when needed.
    const Tesseract = (await import('tesseract.js')).default;

    const results: ScanRow[] = pairs.map((p, i) => ({
      index: i,
      frontPreview: URL.createObjectURL(p.front),
      status: 'pending',
      ocrName: '', ocrNumber: '',
      name: '', setName: '', number: '', rarity: 'Rare', variant: 'Normal',
      condition: 'Near Mint', marketPrice: null, matched: false,
      price: '', stock: defaultStock, include: true, imageUrl: '',
    }));
    setRows([...results]);

    const markupVal = parseFloat(markup) || 10;

    for (let i = 0; i < pairs.length; i++) {
      try {
        // 1) Store the front image (becomes the product image).
        results[i].status = 'reading';
        setRows([...results]);
        const frontUrl = await uploadToBlob(pairs[i].front);
        results[i].imageUrl = frontUrl;

        // 2) OCR the front image in the browser (free, unlimited).
        const { data } = await Tesseract.recognize(pairs[i].front, 'eng');
        const parsed = parseOcr(data);
        results[i].ocrName = parsed.name;
        results[i].ocrNumber = parsed.number;

        // 3) Match against the Pokémon TCG API + our pricing.
        results[i].status = 'matching';
        setRows([...results]);
        const res = await fetch('/api/admin/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nameGuess: parsed.name, number: parsed.number }),
        });
        if (!res.ok) throw new Error(`Match failed (${res.status})`);
        const c = (await res.json()).card;

        results[i].name = c.name || parsed.name || '';
        results[i].setName = c.setName || '';
        results[i].number = c.number || parsed.number || '';
        results[i].rarity = c.rarity || 'Rare';
        results[i].variant = c.variant || 'Normal';
        results[i].marketPrice = c.marketPrice;
        results[i].matched = !!c.matched;
        results[i].price = c.marketPrice
          ? (parseFloat(c.marketPrice) * (1 + markupVal / 100)).toFixed(2)
          : '';
        results[i].include = !!c.name;
        results[i].status = 'done';
      } catch (err: any) {
        results[i].status = 'error';
        results[i].error = err.message || 'Failed';
        results[i].include = false;
      }
      setProgress({ done: i + 1, total: pairs.length });
      setRows([...results]);
    }
    setPhase('review');
  };

  const updateRow = (index: number, field: keyof ScanRow, value: any) => {
    setRows((prev) => prev.map((r) => (r.index === index ? { ...r, [field]: value } : r)));
  };

  const commitAll = async () => {
    setCommitting(true);
    let count = 0;
    const toAdd = rows.filter((r) => r.include && r.name && r.price);
    for (const r of toAdd) {
      try {
        const res = await fetch('/api/admin/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: r.name,
            setName: r.setName || 'Unknown',
            rarity: r.rarity || 'Rare',
            condition: r.condition,
            price: r.price,
            imageUrl: r.imageUrl,
            description: `Variant: ${r.variant}`,
            stock: parseInt(r.stock, 10) || 1,
            sku: r.number || null,
          }),
        });
        if (res.ok) count++;
      } catch { /* skip */ }
    }
    setCommitted(count);
    setCommitting(false);
  };

  const reset = () => {
    setPairs([]); setRows([]); setPhase('idle'); setCommitted(null); setProgress({ done: 0, total: 0 });
  };

  const doneCount = rows.filter((r) => r.status === 'done').length;
  const matchedCount = rows.filter((r) => r.matched).length;
  const includeCount = rows.filter((r) => r.include).length;
  const statusLabel = (s: ScanRow['status']) =>
    s === 'reading' ? '👁 Reading…' : s === 'matching' ? '🔍 Matching…' : s === 'done' ? '✓' : s === 'error' ? '✗' : '';

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-6 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📷 Batch Card Scanner</h1>
        <p className="text-gray-500 mt-1">
          100% free — reads each card in your browser, matches it to market data, and adds it to inventory. No scan limits.
        </p>
      </div>

      {phase === 'idle' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">How are your images arranged?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setLayout('fronts')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${layout === 'fronts' ? 'border-pokemon-red bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="font-semibold text-gray-900">🎴 Fronts only</p>
                <p className="text-xs text-gray-500 mt-1">Each image is a different card front (recommended)</p>
              </button>
              <button onClick={() => setLayout('pairs')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${layout === 'pairs' ? 'border-pokemon-red bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="font-semibold text-gray-900">🔄 Front &amp; Back pairs</p>
                <p className="text-xs text-gray-500 mt-1">Images alternate front, back… (only the front is read)</p>
              </button>
            </div>
          </div>

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

          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="text-5xl mb-3">📸</div>
            <p className="text-gray-600 text-sm mb-5">
              Select all your card photos at once{layout === 'pairs' ? ' (in front, back order)' : ''}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="cursor-pointer px-6 py-3 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600 transition-all">
                📁 Choose Images
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>
              <label className="cursor-pointer px-6 py-3 bg-white text-gray-800 font-semibold rounded-full border-2 border-gray-200 hover:border-pokemon-blue hover:text-pokemon-blue transition-all">
                📷 Take Photos
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>
            </div>
          </div>

          {pairs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-gray-800">{pairs.length} card{pairs.length !== 1 ? 's' : ''} ready</p>
                <button onClick={startScanning}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all">
                  🔍 Scan {pairs.length} Card{pairs.length !== 1 ? 's' : ''}
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                {pairs.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(p.front)} alt={`Card ${i + 1}`}
                      className="w-full aspect-[3/4] object-cover rounded-lg border border-gray-200" />
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'processing' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900">Reading cards… {progress.done} / {progress.total}</span>
            <span className="text-sm text-gray-500">✓ {matchedCount} matched</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {rows.map((r) => (
              <div key={r.index} className="relative">
                <img src={r.frontPreview} alt="" className={`w-full aspect-[3/4] object-cover rounded-lg border ${
                  r.status === 'done' ? (r.matched ? 'border-green-400' : 'border-yellow-400') :
                  r.status === 'error' ? 'border-red-400' : 'border-gray-200'
                } ${r.status === 'reading' || r.status === 'matching' ? 'animate-pulse' : ''}`} />
                <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                  {statusLabel(r.status)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Reading text happens on your device — larger batches take a little longer.</p>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-4">
          {committed === null ? (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-gray-900">Review &amp; edit — {includeCount} selected · {matchedCount} auto-matched of {doneCount}</p>
                  <p className="text-xs text-gray-500">Yellow = OCR read it but no confident match; check the name. Prices use your market data + {markup}% markup.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={reset} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Start over</button>
                  <button onClick={commitAll} disabled={committing || includeCount === 0}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-sm">
                    {committing ? '⏳ Adding…' : `✓ Add ${includeCount} to Inventory`}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-10">✓</th>
                        <th className="px-3 py-2.5 text-left w-14">Img</th>
                        <th className="px-3 py-2.5 text-left">Name</th>
                        <th className="px-3 py-2.5 text-left hidden md:table-cell">Set</th>
                        <th className="px-3 py-2.5 text-left hidden lg:table-cell w-24">Rarity</th>
                        <th className="px-3 py-2.5 text-right">Market</th>
                        <th className="px-3 py-2.5 text-right">Your Price</th>
                        <th className="px-3 py-2.5 text-center w-16">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((r) => (
                        <tr key={r.index} className={r.status === 'error' ? 'bg-red-50/40' : !r.include ? 'opacity-40' : !r.matched && r.status === 'done' ? 'bg-yellow-50/40' : ''}>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={r.include} disabled={r.status === 'error'}
                              onChange={(e) => updateRow(r.index, 'include', e.target.checked)} />
                          </td>
                          <td className="px-3 py-2">
                            <img src={r.frontPreview} alt="" className="w-10 h-14 object-cover rounded border border-gray-200" />
                          </td>
                          <td className="px-3 py-2">
                            {r.status === 'error' ? (
                              <span className="text-red-600 text-xs">✗ {r.error}</span>
                            ) : (
                              <input value={r.name} onChange={(e) => updateRow(r.index, 'name', e.target.value)}
                                placeholder={r.ocrName || 'Enter name'}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                            )}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell">
                            <input value={r.setName} onChange={(e) => updateRow(r.index, 'setName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2 hidden lg:table-cell">
                            <select value={r.rarity} onChange={(e) => updateRow(r.index, 'rarity', e.target.value)}
                              className="px-1 py-1 border border-gray-200 rounded text-xs">
                              {RARITIES.map((x) => <option key={x} value={x}>{x}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500 text-xs">{r.marketPrice ? `$${r.marketPrice}` : '—'}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <span className="text-gray-400">$</span>
                              <input value={r.price} onChange={(e) => updateRow(r.index, 'price', e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-200 rounded text-right text-sm" />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input value={r.stock} onChange={(e) => updateRow(r.index, 'stock', e.target.value)}
                              className="w-12 px-1 py-1 border border-gray-200 rounded text-center text-sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Added {committed} card{committed !== 1 ? 's' : ''} to inventory!</h2>
              <p className="text-gray-500 mb-6">They're now live in your store with market-based pricing.</p>
              <button onClick={reset} className="px-6 py-2.5 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600">Scan more cards</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
