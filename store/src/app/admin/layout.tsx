'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.isAdmin) {
          setAuthorized(true);
        } else if (data.user) {
          // Logged in but not admin
          router.push('/');
        } else {
          // Not logged in
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400">Checking permissions...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-4">You need admin privileges to view this page.</p>
          <Link href="/login" className="text-pokemon-red font-medium hover:underline">
            Log in with an admin account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
