import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import StoreChrome from '@/components/StoreChrome';

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
      </body>
    </html>
  );
}
