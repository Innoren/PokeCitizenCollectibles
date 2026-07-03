import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-red-500 via-red-500 to-orange-400">
      {/* Soft decorative shapes */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-yellow-300/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 border-[32px] border-white/10 rounded-full -translate-y-1/2 hidden lg:block" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left — copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm text-white font-medium">New arrivals added weekly</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-[1.05] drop-shadow-sm">
              Catch Every
              <span className="block">Card You Love</span>
            </h1>

            <p className="text-lg text-white/90 max-w-lg mx-auto lg:mx-0 mb-8">
              Authentic, graded Pokémon cards and sealed products — from Base Set
              classics to the newest releases.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link
                href="/shop"
                className="px-8 py-4 bg-white text-red-600 font-bold rounded-full hover:bg-gray-50 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Shop All Cards
              </Link>
              <Link
                href="/shop?rarity=Sealed+Product"
                className="px-8 py-4 bg-white/15 backdrop-blur-sm border-2 border-white/50 text-white font-semibold rounded-full hover:bg-white/25 transition-all duration-300"
              >
                Sealed Products
              </Link>
            </div>
          </div>

          {/* Right — floating pokeball graphic */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-72 h-72 xl:w-80 xl:h-80 animate-float">
              {/* Pokeball */}
              <div className="w-full h-full rounded-full bg-white shadow-2xl relative overflow-hidden border-8 border-gray-900">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500" />
                <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-900 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white border-8 border-gray-900 z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="relative">
        <svg className="w-full h-12 md:h-16" viewBox="0 0 1440 80" preserveAspectRatio="none" fill="none">
          <path d="M0 80V30C240 60 480 0 720 20C960 40 1200 70 1440 40V80H0Z" fill="#f9fafb" />
        </svg>
      </div>
    </section>
  );
}
