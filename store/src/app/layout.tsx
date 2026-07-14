import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import StoreChrome from '@/components/StoreChrome';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PokeCitizen Collectibles — Premium Pokemon Card Store',
  description: 'Discover rare and authentic Pokémon trading cards. From vintage classics to the latest releases.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreChrome>{children}</StoreChrome>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
