'use client';

import { useEffect, useState } from 'react';

interface AdminEditButtonProps {
  cardId: number;
  currentImageUrl: string;
}

export default function AdminEditButton({ cardId, currentImageUrl }: AdminEditButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => { if (data.user?.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  if (!isAdmin) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageUrl(data.imageUrl);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/cards?id=${cardId}`);
      const cardData = await res.json();
      const card = cardData.cards?.[0];
      if (!card) { alert('Card not found'); return; }

      const updateRes = await fetch('/api/admin/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cardId,
          name: card.name,
          setName: card.setName,
          rarity: card.rarity,
          condition: card.condition,
          price: parseFloat(card.price),
          imageUrl: imageUrl,
          description: card.description || '',
          stock: card.stock,
          sku: card.sku || '',
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error || 'Failed to save');
      }

      setSaved(true);
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-4 w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        ✏️ Edit This Listing
      </button>
    );
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
      <p className="text-sm font-medium text-blue-800">Edit Image</p>

      <div className="flex items-center gap-3">
        <label className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-medium text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors">
          {uploading ? 'Uploading...' : '📷 Upload New Image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </label>
      </div>

      <input
        type="text"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Or paste image URL"
        className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
      />

      {imageUrl && imageUrl !== currentImageUrl && (
        <div className="flex items-center gap-2">
          <img src={imageUrl} alt="Preview" className="h-16 w-16 object-contain rounded border" />
          <span className="text-xs text-green-600">New image ready</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saved}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
        <button
          onClick={() => { setEditing(false); setImageUrl(currentImageUrl); }}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
