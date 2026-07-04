import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Colorful checkered/mosaic background like Pokemon Center */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-200 via-rose-100 to-amber-100">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `
            linear-gradient(45deg, #ef4444 25%, transparent 25%),
            linear-gradient(-45deg, #3b82f6 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #22c55e 75%),
            linear-gradient(-45deg, transparent 75%, #eab308 75%)
          `,
          backgroundSize: '64px 64px',
          backgroundPosition: '0 0, 0 32px, 32px -32px, 32px 0px',
        }} />
        {/* Soft glow blobs */}
        <div className="absolute -top-16 -left-10 w-72 h-72 bg-pokemon-yellow/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-10 w-80 h-80 bg-pokemon-blue/30 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Main banner card */}
        <div className="relative bg-white/95 backdrop-blur rounded-[2rem] shadow-2xl overflow-hidden border border-white">
          {/* Banner gradient top */}
          <div className="h-2.5 bg-gradient-to-r from-pokemon-red via-pokemon-yellow to-pokemon-blue" />

          <div className="grid lg:grid-cols-2 gap-8 items-center p-8 md:p-12">
            {/* Left — copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pokemon-red/10 border border-pokemon-red/20 mb-5">
                <span className="w-2 h-2 rounded-full bg-pokemon-red animate-pulse" />
                <span className="text-sm text-pokemon-red font-semibold">
                  New arrivals added weekly
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-[1.05] tracking-tight">
                Gotta Collect
                <span className="block text-pokemon-red">Them All</span>
              </h1>

              <p className="text-base md:text-lg text-gray-600 max-w-lg mx-auto lg:mx-0 mb-8">
                Authentic, graded cards and sealed product from every generation —
                from Base Set classics to the latest modern set releases.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/shop"
                  className="px-8 py-3.5 bg-pokemon-red text-white font-bold rounded-full hover:bg-red-600 hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Shop All Cards
                </Link>
                <Link
                  href="/shop?rarity=Secret+Rare"
                  className="px-8 py-3.5 bg-white text-gray-800 font-semibold rounded-full border-2 border-gray-200 hover:border-pokemon-blue hover:text-pokemon-blue transition-all duration-300"
                >
                  View Rare Cards
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-center lg:justify-start gap-8 md:gap-10 mt-9 pt-7 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-gray-900">500+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Cards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-gray-900">100%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Authentic</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-gray-900">Free</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Shipping $200+</div>
                </div>
              </div>
            </div>

            {/* Right — floating pokeball */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-72 h-72 xl:w-80 xl:h-80 animate-float">
                <div className="w-full h-full rounded-full bg-white shadow-2xl relative overflow-hidden border-[10px] border-gray-900">
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-pokemon-red" />
                  <div className="absolute top-1/2 left-0 right-0 h-3 bg-gray-900 -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white border-[10px] border-gray-900 z-10" />
                </div>
                {/* orbiting accent dots */}
                <div className="absolute -top-2 right-8 w-6 h-6 rounded-full bg-pokemon-yellow shadow-lg" />
                <div className="absolute bottom-4 -left-2 w-4 h-4 rounded-full bg-pokemon-blue shadow-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
