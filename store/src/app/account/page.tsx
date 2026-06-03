'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserData {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
}

export default function AccountPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-pokemon-red/10 flex items-center justify-center">
            <span className="text-xl font-bold text-pokemon-red">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.isAdmin && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-pokemon-red/10 text-pokemon-red rounded-full font-medium">
                Admin
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          {user.isAdmin && (
            <Link
              href="/admin"
              className="block w-full text-left px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              🛠 Admin Panel
            </Link>
          )}
          {user.isAdmin && (
            <Link
              href="/admin/analytics"
              className="block w-full text-left px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              📊 Sales Analytics
            </Link>
          )}
          <Link
            href="/shop"
            className="block w-full text-left px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            🛒 Continue Shopping
          </Link>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        Log Out
      </button>
    </div>
  );
}
