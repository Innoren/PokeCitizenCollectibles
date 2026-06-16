'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';

interface ZoomableImageProps {
  src: string;
  alt: string;
}

export default function ZoomableImage({ src, alt }: ZoomableImageProps) {
  const [zoomed, setZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageSrc = src && src.trim() ? src : '';

  if (!imageSrc) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
        <svg viewBox="0 0 100 100" className="w-24 h-24 opacity-30">
          <circle cx="50" cy="50" r="48" fill="#EF4444" opacity="0.3" />
          <path d="M 2 50 A 48 48 0 0 0 98 50 Z" fill="#FFFFFF" />
          <rect x="2" y="46" width="96" height="8" fill="#1F2937" opacity="0.3" />
          <circle cx="50" cy="50" r="14" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3" opacity="0.3" />
        </svg>
        <span className="text-sm mt-3">No image uploaded</span>
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  };

  return (
    <>
      {/* Main image with hover zoom */}
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-zoom-in overflow-hidden"
        onMouseMove={handleMouseMove}
        onClick={() => setZoomed(true)}
      >
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className="object-contain p-4 transition-transform duration-200"
          style={{
            transformOrigin: `${position.x}% ${position.y}%`,
          }}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Fullscreen modal on click */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-zoom-out p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition-colors text-xl"
            aria-label="Close zoom"
          >
            ✕
          </button>
          <div className="relative w-full h-full max-w-3xl max-h-[90vh]">
            <Image
              src={imageSrc}
              alt={alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
