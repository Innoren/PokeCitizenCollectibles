import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'PokeCitizen — Status Monitor',
  description: 'Real-time status dashboard for PokeCitizen Collectibles store',
};

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Standalone layout — no Navbar or Footer
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/status-manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PokeCitizen" />
      </head>
      <body className="bg-gray-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
