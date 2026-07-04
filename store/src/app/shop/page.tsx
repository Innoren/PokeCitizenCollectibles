import { db } from '@/db';
import { cards } from '@/db/schema';
import { desc, asc, ilike, eq, and, sql } from 'drizzle-orm';
import CardGrid from '@/components/CardGrid';
import SearchFilter from '@/components/SearchFilter';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 12;

interface ShopPageProps {
  searchParams: {
    search?: string;
    rarity?: string;
    condition?: string;
    sort?: string;
    page?: string;
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { search, rarity, condition, sort, page } = searchParams;
  const currentPage = parseInt(page || '1', 10);

  // Build conditions
  const conditions = [];

  if (search) {
    conditions.push(ilike(cards.name, `%${search}%`));
  }

  if (rarity && rarity !== 'All') {
    conditions.push(eq(cards.rarity, rarity));
  }

  if (condition && condition !== 'All') {
    conditions.push(eq(cards.condition, condition));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build order
  let orderBy;
  switch (sort) {
    case 'price_asc':
      orderBy = asc(cards.price);
      break;
    case 'price_desc':
      orderBy = desc(cards.price);
      break;
    case 'name_asc':
      orderBy = asc(cards.name);
      break;
    case 'name_desc':
      orderBy = desc(cards.name);
      break;
    default:
      orderBy = desc(cards.createdAt);
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(whereClause);

  const totalItems = Number(countResult[0].count);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Get cards
  const allCards = await db
    .select()
    .from(cards)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(ITEMS_PER_PAGE)
    .offset((currentPage - 1) * ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Card Shop
        </h1>
        <p className="text-gray-400">
          Browse our collection of {totalItems} Pokemon cards
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8">
        <SearchFilter />
      </div>

      {/* Results */}
      <CardGrid cards={allCards} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {currentPage > 1 && (
            <Link
              href={`/shop?${new URLSearchParams({
                ...(search && { search }),
                ...(rarity && { rarity }),
                ...(condition && { condition }),
                ...(sort && { sort }),
                page: String(currentPage - 1),
              }).toString()}`}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 hover:border-pokemon-yellow/50 hover:text-white transition-all"
            >
              ← Previous
            </Link>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={`/shop?${new URLSearchParams({
                ...(search && { search }),
                ...(rarity && { rarity }),
                ...(condition && { condition }),
                ...(sort && { sort }),
                page: String(pageNum),
              }).toString()}`}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                pageNum === currentPage
                  ? 'bg-pokemon-yellow text-gray-900'
                  : 'bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:border-pokemon-yellow/50'
              }`}
            >
              {pageNum}
            </Link>
          ))}

          {currentPage < totalPages && (
            <Link
              href={`/shop?${new URLSearchParams({
                ...(search && { search }),
                ...(rarity && { rarity }),
                ...(condition && { condition }),
                ...(sort && { sort }),
                page: String(currentPage + 1),
              }).toString()}`}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 hover:border-pokemon-yellow/50 hover:text-white transition-all"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
