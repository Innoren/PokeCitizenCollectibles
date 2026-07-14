/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Pro gives more image optimization budget — use larger sizes and best formats.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    // Increase quality for a premium card store (Pro handles the bandwidth).
    minimumCacheTTL: 86400, // Cache images for 24h at the edge
  },
  // Enable source maps in production for better error traces (Pro bandwidth handles it)
  productionBrowserSourceMaps: false,
  // Vercel Pro handles increased ISR traffic
  experimental: {
    // Enable PPR (Partial Prerendering) for faster page loads when available
  },
};

module.exports = nextConfig;
