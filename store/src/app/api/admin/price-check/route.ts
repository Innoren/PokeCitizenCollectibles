import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { isNotNull } from 'drizzle-orm';
import { resolveMarketPrice } from '@/lib/marketPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PriceAlert {
  id: number;
  name: string;
  sku: string | null;
  yourPrice: string;
  marketPrice: number | null;
  difference: string;
  status: 'above' | 'below' | 'fair';
  autoPrice: boolean;
  priceMarkup: string;
  lastPriceSync: string | null;
}

export async function GET() {
  try {
    // Only cards with a SKU can be matched to a market price.
    const allCards = await db.select().from(cards).where(isNotNull(cards.sku));

    const alerts: PriceAlert[] = [];

    for (const card of allCards) {
      const marketPrice = await resolveMarketPrice(card);
      if (marketPrice === null) continue;

      const yourPrice = parseFloat(card.price);
      const diff = ((yourPrice - marketPrice) / marketPrice) * 100;

      let status: 'above' | 'below' | 'fair' = 'fair';
      if (diff > 15) status = 'above';
      else if (diff < -15) status = 'below';

      alerts.push({
        id: card.id,
        name: card.name,
        sku: card.sku,
        yourPrice: card.price,
        marketPrice,
        difference: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`,
        status,
        autoPrice: card.autoPrice,
        priceMarkup: card.priceMarkup || '10.00',
        lastPriceSync: card.lastPriceSync ? card.lastPriceSync.toISOString() : null,
      });
    }

    // Sort: items priced below market first (money left on the table).
    alerts.sort((a, b) => {
      const order = { below: 0, above: 1, fair: 2 };
      return order[a.status] - order[b.status];
    });

    return NextResponse.json({ alerts, checkedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Price check error:', error);
    return NextResponse.json({ error: 'Price check failed' }, { status: 500 });
  }
}
