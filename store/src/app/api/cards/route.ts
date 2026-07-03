import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { desc, asc, ilike, eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const rarity = searchParams.get('rarity');
    const condition = searchParams.get('condition');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

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

    const total = Number(countResult[0].count);

    // Get cards
    const result = await db
      .select()
      .from(cards)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      cards: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}
