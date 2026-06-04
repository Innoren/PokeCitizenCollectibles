'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminFloatingButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.isAdmin) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      title="Admin Panel"
      className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center group"
    >
      {/* Pokeball SVG */}
      <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-md">
        {/* Top half - red */}
        <path d="M 5 50 A 45 45 0 0 1 95 50 Z" fill="#EF4444" />
        {/* Bottom half - white */}
        <path d="M 5 50 A 45 45 0 0 0 95 50 Z" fill="#FFFFFF" />
        {/* Middle band */}
        <rect x="5" y="46" width="90" height="8" fill="#1F2937" />
        {/* Outer circle */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1F2937" strokeWidth="5" />
        {/* Center button */}
        <circle cx="50" cy="50" r="12" fill="#FFFFFF" stroke="#1F2937" strokeWidth="5" />
        <circle cx="50" cy="50" r="6" fill="#1F2937" />
      </svg>
      {/* Tooltip */}
      <span className="absolute left-14 bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Admin Panel
      </span>
    </Link>
  );
}
