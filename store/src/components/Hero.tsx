import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

interface FeaturedProduct {
  id: number;
  name: string;
  price: string;
  imageUrl: string | null;
  rarity?: string;
}

// Decorative confetti scattered around the hero (Pokemon Center collage vibe).
const CONFETTI = [
  { emoji: '⚡', top: '12%', left: '6%', size: 'text-4xl', rotate: '-12deg' },
  { emoji: '✨', top: '68%', left: '9%', size: 'text-3xl', rotate: '8deg' },
  { emoji: '⭐', top: '30%', left: '15%', size: 'text-2xl', rotate: '-6deg' },
  { emoji: '🔥', top: '82%', left: '20%', size: 'text-3xl', rotate: '10deg' },
  { emoji: '💧', top: '18%', left: '86%', size: 'text-3xl', rotate: '12deg' },
  { emoji: '🌿', top: '72%', left: '90%', size: 'text-4xl', rotate: '-10deg' },
  { emoji: '⭐', top: '40%', left: '82%', size: 'text-2xl', rotate: '6deg' },
  { emoji: '✨', top: '55%', left: '94%', size: 'text-3xl', rotate: '-8deg' },
];

const DOTS = [
  { color: 'bg-pokemon-red', top: '20%', left: '24%', size: 'w-3 h-3' },
  { color: 'bg-pokemon-blue', top: '78%', left: '30%', size: 'w-4 h-4' },
  { color: 'bg-pokemon-yellow', top: '14%', left: '70%', size: 'w-4 h-4' },
  { color: 'bg-green-400', top: '85%', left: '76%', size: 'w-3 h-3' },
  { color: 'bg-purple-400', top: '50%', left: '4%', size: 'w-3 h-3' },
  { color: 'bg-pink-400', top: '60%', left: '68%', size: 'w-2.5 h-2.5' },
];

export default function Hero({ featured }: { featured?: FeaturedProduct | null }) {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Playful colorful background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-amber-50 to-rose-100" />
      <div className="absolute inset-0 opacity-[0.18]" style={{
        backgroundImage: `
          radial-gradient(circle at 20% 30%, #ef4444 0, transparent 12%),
          radial-gradient(circle at 80% 20%, #3b82f6 0, transparent 12%),
          radial-gradient(circle at 65% 80%, #22c55e 0, transparent 12%),
          radial-gradient(circle at 35% 75%, #eab308 0, transparent 12%)
        `,
      }} />
      {/* Soft glow blobs */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-pokemon-yellow/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-28 right-1/4 w-96 h-96 bg-pokemon-blue/20 rounded-full blur-3xl" />

      {/* Confetti emojis */}
      {CONFETTI.map((c, i) => (
        <span
          key={`c-${i}`}
          className={`absolute ${c.size} select-none hidden sm:block opacity-70`}
          style={{ top: c.top, left: c.left, transform: `rotate(${c.rotate})` }}
          aria-hidden
        >
          {c.emoji}
        </span>
      ))}
      {DOTS.map((d, i) => (
        <span
          key={`d-${i}`}
          className={`absolute ${d.color} ${d.size} rounded-full hidden sm:block opacity-60`}
          style={{ top: d.top, left: d.left }}
          aria-hidden
        />
      ))}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left — copy */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur border border-white shadow-sm mb-5">
              <span className="w-2 h-2 rounded-full bg-pokemon-red animate-pulse" />
              <span className="text-sm text-gray-800 font-semibold">
                New arrivals added weekly
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-[1.05] tracking-tight">
              Find Your
              <span className="block text-pokemon-red">Favorite Card</span>
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

            <div className="flex items-center justify-center lg:justify-start gap-8 md:gap-10 mt-9 pt-7 border-t border-gray-200/70">
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

          {/* Right — featured product spotlight */}
          <div className="relative flex items-center justify-center order-1 lg:order-2">
            {featured && featured.imageUrl ? (
              <Link href={`/shop/${featured.id}`} className="group relative">
                {/* Glow pedestal */}
                <div className="absolute inset-0 -m-6 bg-gradient-to-br from-pokemon-yellow/40 via-pokemon-red/20 to-pokemon-blue/30 rounded-[2.5rem] blur-2xl group-hover:blur-3xl transition-all duration-500" />
                <div className="relative bg-white rounded-3xl shadow-2xl border border-white p-5 w-64 sm:w-72 md:w-80 transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-[1.02]">
                  {/* Featured badge */}
                  <div className="absolute -top-3 -left-3 z-10 px-3 py-1.5 bg-pokemon-red text-white text-xs font-extrabold rounded-full shadow-lg uppercase tracking-wide -rotate-6">
                    Featured
                  </div>
                  <div className="aspect-[3/4] flex items-center justify-center overflow-hidden rounded-2xl bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featured.imageUrl}
                      alt={featured.name}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="pt-4 text-center">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{featured.name}</p>
                    <p className="text-lg font-extrabold text-pokemon-red mt-0.5">{formatPrice(featured.price)}</p>
                  </div>
                </div>
              </Link>
            ) : (
              // Fallback: floating pokeball
              <div className="relative w-64 h-64 md:w-80 md:h-80 animate-float">
                <div className="w-full h-full rounded-full bg-white shadow-2xl relative overflow-hidden border-[10px] border-gray-900">
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-pokemon-red" />
                  <div className="absolute top-1/2 left-0 right-0 h-3 bg-gray-900 -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white border-[10px] border-gray-900 z-10" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom wave divider into the page */}
      <div className="relative -mb-1">
        <svg className="w-full h-10 md:h-16" viewBox="0 0 1440 80" preserveAspectRatio="none" fill="none">
          <path d="M0 80V40C240 70 480 10 720 25C960 40 1200 75 1440 45V80H0Z" fill="rgb(249 250 251 / 0.6)" />
        </svg>
      </div>
    </section>
  );
}
