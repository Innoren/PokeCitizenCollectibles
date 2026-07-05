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
 * GET  — Sync all cards (or those with auto_price = true when ?onlyAuto=1):
 *        newPrice = marketPrice * (1 + markup/100), rounded to 2 dp.
 *        Processes in batches with a small delay to avoid rate-limiting.
 *        Cron-safe: accepts Bearer CRON_SECRET.
 *
 * POST — Toggle auto-pricing / markup for a single card, or enable all.
 *        Body: { id, autoPrice?, priceMarkup? } or { enableAll: true }
 */

function roundPrice(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const onlyAuto = request.nextUrl.searchParams.get('onlyAuto') === '1';
  const batchSize = parseInt(request.nextUrl.searchParams.get('batch') || '10', 10);
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

  try {
    // Fetch cards to sync
    let cardsToSync;
    if (onlyAuto) {
      cardsToSync = await db.select().from(cards).where(eq(cards.autoPrice, true));
    } else {
      cardsToSync = await db.select().from(cards);
    }

    const total = cardsToSync.length;
    // Process only the batch slice
    const batch = cardsToSync.slice(offset, offset + batchSize);

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    const now = new Date();

    for (let i = 0; i < batch.length; i++) {
      const card = batch[i];

      // Add delay every 3 requests to avoid rate-limiting
      if (i > 0 && i % 3 === 0) {
        await delay(300);
      }

      const market = await resolveMarketPrice(card);
      if (market === null) {
        skipped++;
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
            autoPrice: true,
          })
          .where(eq(cards.id, card.id));
        updated++;
      } catch {
        failed++;
      }
    }

    const nextOffset = offset + batchSize;
    const hasMore = nextOffset < total;

    return NextResponse.json({
      ok: true,
      updated,
      failed,
      skipped,
      batchProcessed: batch.length,
      total,
      offset,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
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

    // Enable auto-pricing for ALL cards
    if (body.enableAll) {
      await db.update(cards).set({ autoPrice: true });
      return NextResponse.json({ ok: true, message: 'Auto-pricing enabled for all cards' });
    }

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
