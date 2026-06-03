import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Colorful checkered/mosaic background like Pokemon Center */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-green-50 to-orange-50">
        {/* Decorative colored squares pattern */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            linear-gradient(45deg, #ef4444 25%, transparent 25%),
            linear-gradient(-45deg, #3b82f6 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #22c55e 75%),
            linear-gradient(-45deg, transparent 75%, #eab308 75%)
          `,
          backgroundSize: '60px 60px',
          backgroundPosition: '0 0, 0 30px, 30px -30px, 30px 0px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Main banner card */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Banner gradient top */}
          <div className="h-2 bg-gradient-to-r from-pokemon-red via-pokemon-yellow to-pokemon-blue" />

          <div className="p-8 md:p-12 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pokemon-yellow/10 border border-pokemon-yellow/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-pokemon-red animate-pulse" />
              <span className="text-sm text-gray-700 font-medium">
                ✨ New arrivals added weekly
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Premium Pokémon
              <span className="block text-pokemon-red">Trading Cards</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Authentic, graded cards from every generation. From Base Set classics
              to the latest Scarlet & Violet releases.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/shop"
                className="px-8 py-3.5 bg-pokemon-red text-white font-semibold rounded-full hover:bg-red-600 hover:shadow-lg transition-all duration-300"
              >
                Shop All Cards
              </Link>
              <Link
                href="/shop?rarity=Secret+Rare"
                className="px-8 py-3.5 bg-gray-100 text-gray-800 font-semibold rounded-full hover:bg-gray-200 transition-all duration-300"
              >
                View Rare Cards
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 md:gap-12 mt-10 pt-8 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">500+</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Cards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">100%</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Authentic</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">Free</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Shipping $50+</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">24hr</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Dispatch</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
