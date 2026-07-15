'use client';

import { useState, useRef } from 'react';

interface ScanResult {
  name: string;
  setName: string;
  number: string;
  rarity: string;
  variant: string;
  marketPrice: string | null;
  condition: string;
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [markup, setMarkup] = useState('10');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (file: File) => {
    setScanning(true);
    setError(null);
    setResult(null);
    setAdded(false);

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/scan', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scan failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data.card);
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    }
    setScanning(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleScan(file);
  };

  const addToInventory = async () => {
    if (!result) return;
    setAdding(true);
    try {
      const markupVal = parseFloat(markup) || 10;
      const basePrice = result.marketPrice ? parseFloat(result.marketPrice) : 0;
      const price = basePrice > 0 ? (basePrice * (1 + markupVal / 100)).toFixed(2) : '0.00';

      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.name,
          setName: result.setName,
          rarity: result.rarity || 'Rare',
          condition: result.condition,
          price,
          imageUrl: previewUrl || '',
          description: `Variant: ${result.variant}`,
          stock: 1,
          sku: result.number || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add');
      }
      setAdded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add to inventory');
    }
    setAdding(false);
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setPreviewUrl(null);
    setAdded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-8 mt-8 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📷 Card Scanner</h1>
        <p className="text-gray-500 mt-1">
          Take a photo or upload an image — AI identifies the card, pulls market price, and adds it to your inventory
        </p>
      </div>

      {/* Camera / Upload area */}
      {!scanning && !result && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Scan a Card</h2>
          <p className="text-gray-500 text-sm mb-6">
            Take a clear photo of the card front, or upload an existing image
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Camera button (mobile) */}
            <label className="cursor-pointer px-6 py-3 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600 transition-all shadow-sm">
              📷 Take Photo
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* File upload button */}
            <label className="cursor-pointer px-6 py-3 bg-white text-gray-800 font-semibold rounded-full border-2 border-gray-200 hover:border-pokemon-blue hover:text-pokemon-blue transition-all">
              📁 Upload Image
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Supported: JPG, PNG, WebP • Best results with a clear, well-lit photo of the full card front
          </p>
        </div>
      )}

      {/* Scanning state */}
      {scanning && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          {previewUrl && (
            <img src={previewUrl} alt="Scanning..." className="w-48 h-auto mx-auto rounded-xl mb-4 opacity-70" />
          )}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-5 h-5 border-3 border-pokemon-red border-t-transparent rounded-full animate-spin" />
            <span className="text-lg font-semibold text-gray-800">Identifying card...</span>
          </div>
          <p className="text-sm text-gray-500">
            AI is analyzing the image. This typically takes 30-60 seconds.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-medium">✗ {error}</p>
          <button onClick={reset} className="mt-2 text-sm underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-4">
          {/* Header */}
          <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-2">
            <span className="text-green-600 text-lg">✓</span>
            <span className="font-semibold text-green-800">Card Identified!</span>
          </div>

          <div className="p-6">
            <div className="flex gap-6">
              {/* Preview */}
              {previewUrl && (
                <div className="w-32 h-44 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img src={previewUrl} alt={result.name} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Details */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{result.name}</h3>
                <div className="mt-2 space-y-1 text-sm">
                  {result.setName && (
                    <p className="text-gray-600"><span className="font-medium text-gray-700">Set:</span> {result.setName}</p>
                  )}
                  {result.number && (
                    <p className="text-gray-600"><span className="font-medium text-gray-700">Number:</span> #{result.number}</p>
                  )}
                  {result.rarity && (
                    <p className="text-gray-600"><span className="font-medium text-gray-700">Rarity:</span> {result.rarity}</p>
                  )}
                  <p className="text-gray-600"><span className="font-medium text-gray-700">Variant:</span> {result.variant}</p>
                  <p className="text-gray-600"><span className="font-medium text-gray-700">Condition:</span> {result.condition}</p>
                </div>

                {/* Market price */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Market Price:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {result.marketPrice ? `$${result.marketPrice}` : 'N/A'}
                    </span>
                  </div>
                  {result.marketPrice && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Your price ({markup}% markup):</span>
                      <span className="text-sm font-semibold text-pokemon-red">
                        ${(parseFloat(result.marketPrice) * (1 + parseFloat(markup) / 100)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Markup:</label>
                <input
                  type="number"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm"
                  min="0" max="200" step="1"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>

              {!added ? (
                <button
                  onClick={addToInventory}
                  disabled={adding}
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all"
                >
                  {adding ? '⏳ Adding...' : '✓ Add to Inventory'}
                </button>
              ) : (
                <div className="px-6 py-2.5 bg-green-100 text-green-700 font-semibold rounded-lg">
                  ✓ Added to inventory!
                </div>
              )}

              <button
                onClick={reset}
                className="px-4 py-2.5 text-gray-600 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                Scan Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800 font-medium">💡 Tips for best results:</p>
        <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc pl-5">
          <li>Take a clear, well-lit photo of the full card front</li>
          <li>Avoid glare, shadows, and angled shots</li>
          <li>The card name, set symbol, and number should all be visible</li>
          <li>Works best with English Pokémon cards</li>
        </ul>
      </div>
    </div>
  );
}
