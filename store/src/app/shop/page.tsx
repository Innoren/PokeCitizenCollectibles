import { db } from '@/db';
import { cards } from '@/db/schema';
import { desc, asc, ilike, eq, and, sql } from 'drizzle-orm';
import CardGrid from '@/components/CardGrid';
import SearchFilter from '@/components/SearchFilter';
import SortDropdown from '@/components/SortDropdown';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 12;

interface ShopPageProps {
  searchParams: {
    search?: string;
    category?: string;
    rarity?: string;
    condition?: string;
    sort?: string;
    page?: string;
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { search, rarity, condition, sort, page } = searchParams;
  const category = searchParams.category;
  const currentPage = parseInt(page || '1', 10);

  // Build conditions
  const conditions = [];

  if (search) {
    conditions.push(ilike(cards.name, `%${search}%`));
  }

  if (category && category !== 'All') {
    conditions.push(eq(cards.category, category));
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

  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const buildHref = (targetPage: number) =>
    `/shop?${new URLSearchParams({
      ...(search && { search }),
      ...(rarity && { rarity }),
      ...(condition && { condition }),
      ...(sort && { sort }),
      page: String(targetPage),
    }).toString()}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-pokemon-red">HOME</Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="text-gray-700 font-medium">TCG CARDS</span>
      </nav>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">TCG Cards</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar filters */}
        <SearchFilter />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Content header: count + sort */}
          <div className="flex items-center justify-between gap-4 pb-4 mb-6 border-b border-gray-200">
            <p className="text-sm text-gray-500">
              {totalItems === 0 ? 'No products' : (
                <>Products <span className="text-gray-800 font-medium">{rangeStart}&ndash;{rangeEnd}</span> of {totalItems}</>
              )}
            </p>
            <SortDropdown />
          </div>

          {/* Results */}
          <CardGrid cards={allCards} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              {currentPage > 1 && (
                <Link
                  href={buildHref(currentPage - 1)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:border-pokemon-red hover:text-pokemon-red transition-all"
                >
                  &larr; Prev
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((pageNum, idx, arr) => (
                  <div key={pageNum} className="flex items-center gap-2">
                    {idx > 0 && pageNum - arr[idx - 1] > 1 && (
                      <span className="text-gray-400 px-1">&hellip;</span>
                    )}
                    <Link
                      href={buildHref(pageNum)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        pageNum === currentPage
                          ? 'bg-pokemon-red text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-pokemon-red hover:text-pokemon-red'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  </div>
                ))}

              {currentPage < totalPages && (
                <Link
                  href={buildHref(currentPage + 1)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:border-pokemon-red hover:text-pokemon-red transition-all"
                >
                  Next &rarr;
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
