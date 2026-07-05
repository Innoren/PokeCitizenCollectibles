import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { resolveMarketPrice } from '@/lib/marketPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Automatic market-based pricing.
 *
 * GET  — Sync every card with auto_price = true:
 *        newPrice = marketPrice * (1 + markup/100), rounded to 2 dp.
 *        Also records last_market_price and last_price_sync.
 *        Cron-safe: if CRON_SECRET is set, a matching Bearer token is accepted.
 *
 * POST — Toggle auto-pricing / markup for a single card.
 *        Body: { id, autoPrice?, priceMarkup? }
 */

function roundPrice(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function GET(request: NextRequest) {
  // Optional cron authorization: when a CRON_SECRET is configured and an
  // Authorization header is present, it must match. The admin UI (no header)
  // is allowed through to preserve existing behaviour.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const autoCards = await db.select().from(cards).where(eq(cards.autoPrice, true));

    let updated = 0;
    let failed = 0;
    const now = new Date();

    for (const card of autoCards) {
      const market = await resolveMarketPrice(card);
      if (market === null) {
        failed++;
        continue;
      }

      const markup = parseFloat(card.priceMarkup ?? '10') || 0;
      const newPrice = roundPrice(market * (1 + markup / 100));

      try {
        await db
          .update(cards)
          .set({
            price: newPrice,
            lastMarketPrice: roundPrice(market),
            lastPriceSync: now,
          })
          .where(eq(cards.id, card.id));
        updated++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      failed,
      total: autoCards.length,
      syncedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Auto-price sync error:', error);
    return NextResponse.json({ error: 'Auto-price sync failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, autoPrice, priceMarkup } = body;

    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (autoPrice !== undefined) updates.autoPrice = Boolean(autoPrice);
    if (priceMarkup !== undefined) {
      const m = parseFloat(priceMarkup);
      if (!isNaN(m)) updates.priceMarkup = m.toFixed(2);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(cards).set(updates).where(eq(cards.id, parseInt(String(id), 10)));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Auto-price update error:', error);
    return NextResponse.json({ error: 'Failed to update auto-price settings' }, { status: 500 });
  }
}
