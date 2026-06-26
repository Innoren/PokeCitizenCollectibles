import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-16">
      {/* Top colored bar */}
      <div className="h-1 bg-gradient-to-r from-pokemon-red via-pokemon-yellow to-pokemon-blue" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border-2 border-gray-900" />
              </div>
              <span className="text-lg font-bold text-white">PokeCitizen</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted source for authentic Pokémon trading cards. Every card verified and graded.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Shop</h3>
            <ul className="space-y-2">
              <li><Link href="/shop" className="text-gray-400 hover:text-white text-sm transition-colors">All Cards</Link></li>
              <li><Link href="/shop?rarity=Rare" className="text-gray-400 hover:text-white text-sm transition-colors">Rare Cards</Link></li>
              <li><Link href="/shop?rarity=Ultra+Rare" className="text-gray-400 hover:text-white text-sm transition-colors">Ultra Rare</Link></li>
              <li><Link href="/shop?rarity=Secret+Rare" className="text-gray-400 hover:text-white text-sm transition-colors">Secret Rare</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Help</h3>
            <ul className="space-y-2">
              <li><span className="text-gray-400 text-sm">Shipping Info</span></li>
              <li><Link href="/returns" className="text-gray-400 hover:text-white text-sm transition-colors">Returns & Refunds</Link></li>
              <li><span className="text-gray-400 text-sm">Card Grading Guide</span></li>
              <li><span className="text-gray-400 text-sm">Contact Us</span></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Policies</h3>
            <ul className="space-y-2">
              <li><span className="text-gray-400 text-sm">✓ Free shipping over $200</span></li>
              <li><span className="text-gray-400 text-sm">✓ All sales final</span></li>
              <li><span className="text-gray-400 text-sm">✓ Authenticity guaranteed</span></li>
              <li><span className="text-gray-400 text-sm">✓ Secure packaging</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} PokeCitizen Collectibles. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            Not affiliated with Nintendo, The Pokémon Company, or Creatures Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
