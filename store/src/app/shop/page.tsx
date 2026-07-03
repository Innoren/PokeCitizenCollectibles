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
    category?: string;
    sort?: string;
    page?: string;
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { search, rarity, condition, category, sort, page } = searchParams;
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
  if (category && category !== 'All') {
    conditions.push(eq(cards.category, category));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build order
  let orderBy;
  switch (sort) {
    case 'price_asc': orderBy = asc(cards.price); break;
    case 'price_desc': orderBy = desc(cards.price); break;
    case 'name_asc': orderBy = asc(cards.name); break;
    case 'name_desc': orderBy = desc(cards.name); break;
    default: orderBy = desc(cards.createdAt);
  }

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(whereClause);

  const totalItems = Number(countResult[0].count);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const allCards = await db
    .select()
    .from(cards)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(ITEMS_PER_PAGE)
    .offset((currentPage - 1) * ITEMS_PER_PAGE);

  // Helper to build pagination links preserving all filters
  const buildQuery = (pageNum: number) =>
    `/shop?${new URLSearchParams({
      ...(search && { search }),
      ...(rarity && { rarity }),
      ...(condition && { condition }),
      ...(category && { category }),
      ...(sort && { sort }),
      page: String(pageNum),
    }).toString()}`;

  // Category tabs — auto-distribute products
  const categoryTabs = [
    { label: 'All Products', value: '' },
    { label: 'Single Cards', value: 'Single Card' },
    { label: 'Sealed Products', value: 'Sealed Product' },
  ];

  const activeTitle =
    category === 'Single Card' ? 'Single Cards' :
    category === 'Sealed Product' ? 'Sealed Products' :
    'All Products';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{activeTitle}</h1>
        <p className="text-gray-500">
          Browse our collection of {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {categoryTabs.map((tab) => {
          const active = (category || '') === tab.value;
          const href = tab.value
            ? `/shop?category=${encodeURIComponent(tab.value)}`
            : '/shop';
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-pokemon-red text-pokemon-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
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
              href={buildQuery(currentPage - 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-pokemon-red/50 hover:text-pokemon-red transition-all"
            >
              ← Previous
            </Link>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={buildQuery(pageNum)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                pageNum === currentPage
                  ? 'bg-pokemon-red text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-pokemon-red/50'
              }`}
            >
              {pageNum}
            </Link>
          ))}

          {currentPage < totalPages && (
            <Link
              href={buildQuery(currentPage + 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-pokemon-red/50 hover:text-pokemon-red transition-all"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
