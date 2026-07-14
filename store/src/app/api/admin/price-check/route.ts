import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { resolveMarketPrice } from '@/lib/marketPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface PriceAlert {
  id: number;
  name: string;
  sku: string | null;
  setName: string;
  yourPrice: string;
  marketPrice: number | null;
  difference: string;
  status: 'above' | 'below' | 'fair' | 'no_data';
  autoPrice: boolean;
  priceMarkup: string;
  lastPriceSync: string | null;
  lastMarketPrice: string | null;
}

/**
 * GET - Check prices for a batch of cards.
 * Query params:
 *   ?page=1 (default: 1, each page = 20 cards)
 *   ?refresh=1 (actually hit the API; without it, just show stored last_market_price)
 */
export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const refresh = request.nextUrl.searchParams.get('refresh') === '1';
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const allCards = await db
      .select()
      .from(cards)
      .orderBy(desc(cards.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db.select().from(cards);
    const total = totalResult.length;

    const alerts: PriceAlert[] = [];

    for (const card of allCards) {
      let marketPrice: number | null = null;

      if (refresh) {
        // Actually hit the API
        marketPrice = await resolveMarketPrice(card);
      } else {
        // Just use stored value
        marketPrice = card.lastMarketPrice ? parseFloat(card.lastMarketPrice) : null;
      }

      const yourPrice = parseFloat(card.price);
      let status: 'above' | 'below' | 'fair' | 'no_data' = 'no_data';
      let difference = 'N/A';

      if (marketPrice !== null && marketPrice > 0) {
        const diff = ((yourPrice - marketPrice) / marketPrice) * 100;
        if (diff > 15) status = 'above';
        else if (diff < -15) status = 'below';
        else status = 'fair';
        difference = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
      }

      alerts.push({
        id: card.id,
        name: card.name,
        sku: card.sku,
        setName: card.setName,
        yourPrice: card.price,
        marketPrice,
        difference,
        status,
        autoPrice: card.autoPrice,
        priceMarkup: card.priceMarkup || '10.00',
        lastPriceSync: card.lastPriceSync ? card.lastPriceSync.toISOString() : null,
        lastMarketPrice: card.lastMarketPrice || null,
      });
    }

    return NextResponse.json({
      alerts,
      page,
      total,
      totalPages: Math.ceil(total / limit),
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Price check error:', error);
    return NextResponse.json({ error: 'Price check failed' }, { status: 500 });
  }
}
