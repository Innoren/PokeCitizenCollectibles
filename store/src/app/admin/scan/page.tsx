'use client';

import { useState, useCallback } from 'react';

interface Pair { id: number; frontPreview: string; backPreview: string; frontFile: File; backFile: File; }
interface CardRow {
  index: number; frontPreview: string; backPreview: string;
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error'; imageUrl: string;
  frontFile: File; backFile: File;
  name: string; setName: string; number: string; rarity: string; condition: string;
  price: string; stock: string; include: boolean;
  matchStatus: 'idle' | 'scanning' | 'matched' | 'not_found'; marketPrice: string | null;
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
  const [identifying, setIdentifying] = useState(false);
  const [identifyProgress, setIdentifyProgress] = useState({ done: 0, total: 0 });

  // ═══ FILE HANDLING ═══
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length < 2) { alert('Upload at least 2 images (front + back per card).'); return; }
    const newPairs: Pair[] = [];
    for (let i = 0; i < arr.length - 1; i += 2) {
      newPairs.push({ id: i / 2, frontFile: arr[i], backFile: arr[i + 1], frontPreview: URL.createObjectURL(arr[i]), backPreview: URL.createObjectURL(arr[i + 1]) });
    }
    if (arr.length % 2 !== 0) newPairs.push({ id: newPairs.length, frontFile: arr[arr.length - 1], backFile: arr[arr.length - 1], frontPreview: URL.createObjectURL(arr[arr.length - 1]), backPreview: '' });
    setPairs(newPairs); setPhase('pairing');
  };
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }, []);
  const flipPair = (id: number) => setPairs((p) => p.map((x) => x.id === id ? { ...x, frontFile: x.backFile, backFile: x.frontFile, frontPreview: x.backPreview, backPreview: x.frontPreview } : x));
  const flipAll = () => setPairs((p) => p.map((x) => ({ ...x, frontFile: x.backFile, backFile: x.frontFile, frontPreview: x.backPreview, backPreview: x.frontPreview })));
  const removePair = (id: number) => setPairs((p) => p.filter((x) => x.id !== id));

  // ═══ UPLOAD ═══
  const startUpload = async () => {
    if (pairs.length === 0) return;
    setPhase('uploading'); setUploadProgress({ done: 0, total: pairs.length });
    const newRows: CardRow[] = pairs.map((p, i) => ({
      index: i, frontPreview: p.frontPreview, backPreview: p.backPreview,
      uploadStatus: 'pending', imageUrl: '', frontFile: p.frontFile, backFile: p.backFile,
      name: '', setName: '', number: '', rarity: 'Rare', condition: 'Near Mint',
      price: '', stock: defaultStock, include: true, matchStatus: 'idle', marketPrice: null,
    }));
    setRows(newRows);
    let done = 0;
    for (let i = 0; i < newRows.length; i += 4) {
      await Promise.all(newRows.slice(i, i + 4).map(async (row) => {
        row.uploadStatus = 'uploading'; setRows([...newRows]);
        try {
          const fd = new FormData(); fd.append('file', row.frontFile);
          const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
          if (!res.ok) throw new Error(); row.imageUrl = (await res.json()).imageUrl; row.uploadStatus = 'done';
        } catch { row.uploadStatus = 'error'; row.include = false; }
        done++; setUploadProgress({ done, total: pairs.length }); setRows([...newRows]);
      }));
    }
    setPhase('ready');
  };

  // ═══ IDENTIFY ALL (Gemini AI) ═══
  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  const identifyAll = async () => {
    setIdentifying(true);
    const toScan = rows.filter((r) => r.include && r.matchStatus !== 'matched');
    setIdentifyProgress({ done: 0, total: toScan.length });
    const markupVal = parseFloat(markup) || 10;
    let done = 0;

    // Process 4 cards in parallel for speed.
    for (let i = 0; i < toScan.length; i += 4) {
      const batch = toScan.slice(i, i + 4);
      await Promise.all(batch.map(async (row) => {
        setRows((prev) => prev.map((r) => r.index === row.index ? { ...r, matchStatus: 'scanning' } : r));
        try {
          const base64 = await fileToBase64(row.frontFile);
          const res = await fetch('/api/admin/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 }),
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Scan failed');
          const { card } = await res.json();
          setRows((prev) => prev.map((r) => r.index === row.index ? {
            ...r, name: card.name || '', setName: card.setName || '', number: card.number || '',
            rarity: card.rarity || 'Rare', marketPrice: card.marketPrice,
            price: card.marketPrice ? (parseFloat(card.marketPrice) * (1 + markupVal / 100)).toFixed(2) : '',
            matchStatus: card.name ? 'matched' : 'not_found',
          } : r));
        } catch {
          setRows((prev) => prev.map((r) => r.index === row.index ? { ...r, matchStatus: 'not_found' } : r));
        }
        done++; setIdentifyProgress({ done, total: toScan.length });
      }));
    }
    setIdentifying(false);
  };

  // ═══ COMMIT ═══
  const updateRow = (index: number, field: keyof CardRow, value: any) => setRows((prev) => prev.map((r) => (r.index === index ? { ...r, [field]: value } : r)));
  const commitAll = async () => {
    setCommitting(true); let count = 0;
    for (const r of rows.filter((r) => r.include && r.name && r.price && r.imageUrl)) {
      try {
        const res = await fetch('/api/admin/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: r.name, setName: r.setName || 'Unknown', rarity: r.rarity || 'Rare', condition: r.condition, price: r.price, imageUrl: r.imageUrl, description: '', stock: parseInt(r.stock, 10) || 1, sku: r.number || null }) });
        if (res.ok) count++;
      } catch {}
    }
    setCommitted(count); setPhase('committed'); setCommitting(false);
  };
  const reset = () => { setPairs([]); setRows([]); setPhase('idle'); setCommitted(0); };
  const includeCount = rows.filter((r) => r.include && r.name && r.price).length;
  const matchedCount = rows.filter((r) => r.matchStatus === 'matched').length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-6 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📷 Bulk Card Scanner</h1>
        <p className="text-gray-500 mt-1">Upload front/back JPEGs → pair → AI identifies every card automatically (name, number, set) → prices from your market system → add to inventory.</p>
      </div>

      {/* IDLE */}
      {phase === 'idle' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-wrap gap-6">
            <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Markup %</label><input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Default stock</label><input type="number" value={defaultStock} onChange={(e) => setDefaultStock(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-pokemon-red/50 transition-colors">
            <div className="text-5xl mb-3">📁</div>
            <p className="text-lg font-semibold text-gray-700 mb-2">Drop card JPEGs here</p>
            <p className="text-gray-500 text-sm mb-5">Upload in <strong>front, back, front, back…</strong> order</p>
            <label className="cursor-pointer inline-block px-8 py-3 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600">Choose Files<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} /></label>
          </div>
        </div>
      )}

      {/* PAIRING */}
      {phase === 'pairing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
            <div><p className="font-semibold text-gray-900">Front/Back pairs</p><p className="text-xs text-gray-500">{pairs.length * 2} images → {pairs.length} cards</p></div>
            <div className="flex gap-2">
              <button onClick={flipAll} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">🔄 Flip All</button>
              <button onClick={startUpload} className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg text-sm">✓ Continue ({pairs.length} cards)</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pairs.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Pair #{p.id + 1}</span>
                  <div className="flex gap-2">
                    <button onClick={() => flipPair(p.id)} className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50">🔄 Flip</button>
                    <button onClick={() => removePair(p.id)} className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50">🗑</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center"><p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Front</p><img src={p.frontPreview} alt="" className="w-full aspect-[3/4] object-cover rounded-lg border border-gray-200" /></div>
                  <div className="text-center"><p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Back</p>{p.backPreview ? <img src={p.backPreview} alt="" className="w-full aspect-[3/4] object-cover rounded-lg border border-gray-200" /> : <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg" />}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPLOADING */}
      {phase === 'uploading' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <span className="font-semibold text-gray-900">Uploading… {uploadProgress.done}/{uploadProgress.total}</span>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all" style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* READY */}
      {phase === 'ready' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{rows.length} cards uploaded — {matchedCount} identified</p>
              {identifying && <p className="text-xs text-blue-600">⏳ Identifying… {identifyProgress.done}/{identifyProgress.total}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={identifyAll} disabled={identifying} className="px-5 py-2 bg-pokemon-red text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50">
                {identifying ? `⏳ ${identifyProgress.done}/${identifyProgress.total}` : '🤖 Identify All'}
              </button>
              <button onClick={commitAll} disabled={committing || includeCount === 0} className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                {committing ? '⏳…' : `✓ Add ${includeCount} to Inventory`}
              </button>
              <button onClick={reset} className="px-3 py-2 text-gray-500 border border-gray-300 rounded-lg text-sm">Reset</button>
            </div>
          </div>

          {/* Progress bar during identification */}
          {identifying && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pokemon-red to-orange-500 transition-all" style={{ width: `${identifyProgress.total ? (identifyProgress.done / identifyProgress.total) * 100 : 0}%` }} />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                  <tr>
                    <th className="px-2 py-2.5 text-center w-8">✓</th>
                    <th className="px-2 py-2.5 text-left w-16">Front</th>
                    <th className="px-2 py-2.5 text-left w-16">Back</th>
                    <th className="px-2 py-2.5 text-left">Card Name</th>
                    <th className="px-2 py-2.5 text-left w-16">#</th>
                    <th className="px-2 py-2.5 text-left hidden md:table-cell">Set</th>
                    <th className="px-2 py-2.5 text-right w-20">Market</th>
                    <th className="px-2 py-2.5 text-right w-24">Price</th>
                    <th className="px-2 py-2.5 text-center w-12">Qty</th>
                    <th className="px-2 py-2.5 text-left w-28">Condition</th>
                    <th className="px-2 py-2.5 text-center w-10">AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.index} className={!r.include ? 'opacity-40' : r.matchStatus === 'matched' ? 'bg-green-50/30' : ''}>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={r.include} onChange={(e) => updateRow(r.index, 'include', e.target.checked)} /></td>
                      <td className="px-2 py-1.5"><img src={r.frontPreview} alt="" className="w-12 h-16 object-cover rounded border border-gray-200" /></td>
                      <td className="px-2 py-1.5"><img src={r.backPreview} alt="" className="w-12 h-16 object-cover rounded border border-gray-200" /></td>
                      <td className="px-2 py-1.5"><input value={r.name} onChange={(e) => updateRow(r.index, 'name', e.target.value)} placeholder="Auto-fills on identify" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></td>
                      <td className="px-2 py-1.5"><input value={r.number} onChange={(e) => updateRow(r.index, 'number', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-center" placeholder="#" /></td>
                      <td className="px-2 py-1.5 hidden md:table-cell"><input value={r.setName} onChange={(e) => updateRow(r.index, 'setName', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" placeholder="Auto" /></td>
                      <td className="px-2 py-1.5 text-right text-xs text-gray-500">{r.marketPrice ? `$${r.marketPrice}` : '—'}</td>
                      <td className="px-2 py-1.5 text-right"><div className="flex items-center justify-end gap-0.5"><span className="text-gray-400 text-xs">$</span><input value={r.price} onChange={(e) => updateRow(r.index, 'price', e.target.value)} className="w-16 px-1.5 py-1 border border-gray-200 rounded text-right text-sm" /></div></td>
                      <td className="px-2 py-1.5 text-center"><input value={r.stock} onChange={(e) => updateRow(r.index, 'stock', e.target.value)} className="w-10 px-1 py-1 border border-gray-200 rounded text-center text-xs" /></td>
                      <td className="px-2 py-1.5"><select value={r.condition} onChange={(e) => updateRow(r.index, 'condition', e.target.value)} className="w-full px-1 py-1 border border-gray-200 rounded text-xs"><option value="Mint">Mint</option><option value="Near Mint">Near Mint</option><option value="Excellent">Excellent</option><option value="Good">Good</option><option value="Played">Played</option><option value="Factory Sealed">Factory Sealed</option></select></td>
                      <td className="px-2 py-1.5 text-center">
                        {r.matchStatus === 'matched' && <span className="text-green-600 text-sm">✓</span>}
                        {r.matchStatus === 'scanning' && <span className="text-blue-500 text-xs animate-pulse">⏳</span>}
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

      {/* COMMITTED */}
      {phase === 'committed' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Added {committed} card{committed !== 1 ? 's' : ''} to inventory!</h2>
          <p className="text-gray-500 mb-6">They're live in your store with market-based pricing.</p>
          <button onClick={reset} className="px-6 py-2.5 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600">Upload more</button>
        </div>
      )}
    </div>
  );
}
