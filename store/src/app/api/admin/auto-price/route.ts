import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { resolveMarketPriceDetailed } from '@/lib/marketPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  const batchSize = Math.min(parseInt(request.nextUrl.searchParams.get('batch') || '2', 10), 5);
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);
  const markupOverride = request.nextUrl.searchParams.get('markup');
  const globalMarkup = markupOverride !== null ? parseFloat(markupOverride) : null;
  const onlyAuto = request.nextUrl.searchParams.get('onlyAuto') === '1';

  try {
    // Get total count (filtered if onlyAuto)
    const countResult = onlyAuto
      ? await db.select({ count: sql<number>`count(*)` }).from(cards).where(eq(cards.autoPrice, true))
      : await db.select({ count: sql<number>`count(*)` }).from(cards);
    const total = Number(countResult[0].count);

    // Only fetch the batch we need
    const baseQuery = db.select().from(cards);
    const batch = onlyAuto
      ? await baseQuery.where(eq(cards.autoPrice, true)).orderBy(cards.id).limit(batchSize).offset(offset)
      : await baseQuery.orderBy(cards.id).limit(batchSize).offset(offset);

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    const now = new Date();
    const details: Array<{
      id: number;
      name: string;
      status: 'updated' | 'skipped' | 'failed';
      reason?: string;
      oldPrice?: string;
      newPrice?: string;
      marketPrice?: number;
    }> = [];

    for (let i = 0; i < batch.length; i++) {
      const card = batch[i];

      // Small delay between requests to avoid rate-limiting
      if (i > 0) {
        await delay(100);
      }

      // Sealed products (ETBs, booster boxes, bundles, tins) aren't in the
      // Pokemon TCG API — skip them to avoid slow, fruitless searches.
      const isSealed =
        card.rarity === 'Sealed Product' ||
        card.condition === 'Factory Sealed';
      if (isSealed) {
        skipped++;
        details.push({ id: card.id, name: card.name, status: 'skipped', reason: 'Sealed product — no market data in TCG API (price manually)' });
        continue;
      }

      try {
        // Hard cap each card's lookup so a slow/hanging API call can never
        // blow past the function's time budget (Promise.race guarantees this
        // even if the underlying fetch/body-read ignores its abort signal).
        const result = await Promise.race<{ price: number | null; reason: string }>([
          resolveMarketPriceDetailed(card),
          new Promise<{ price: null; reason: string }>((resolve) =>
            setTimeout(() => resolve({ price: null, reason: 'timeout' }), 11000)
          ),
        ]);
        const market = result.price;
        if (market === null) {
          skipped++;
          const reasonMsg =
            result.reason === 'not_found'
              ? 'Not found in Pokémon TCG database (non-Pokémon card or name mismatch)'
              : result.reason === 'no_price'
              ? 'Card found, but TCGPlayer has no market price yet (often brand-new sets)'
              : result.reason === 'timeout'
              ? 'Lookup timed out — try again'
              : 'No market price available';
          details.push({ id: card.id, name: card.name, status: 'skipped', reason: reasonMsg });
          continue;
        }

        const markup = (globalMarkup !== null && !isNaN(globalMarkup))
          ? globalMarkup
          : (parseFloat(card.priceMarkup ?? '10') || 0);
        const newPrice = roundPrice(market * (1 + markup / 100));

        const updateData: Record<string, any> = {
          price: newPrice,
          lastMarketPrice: roundPrice(market),
          lastPriceSync: now,
          autoPrice: true,
        };
        if (globalMarkup !== null && !isNaN(globalMarkup)) {
          updateData.priceMarkup = globalMarkup.toFixed(2);
        }
        await db.update(cards).set(updateData).where(eq(cards.id, card.id));
        updated++;
        details.push({
          id: card.id,
          name: card.name,
          status: 'updated',
          oldPrice: card.price,
          newPrice,
          marketPrice: market,
        });
      } catch {
        failed++;
        details.push({ id: card.id, name: card.name, status: 'failed', reason: 'Error while updating' });
      }
    }

    const nextOffset = offset + batchSize;
    const hasMore = nextOffset < total;

    return NextResponse.json({
      ok: true,
      updated,
      failed,
      skipped,
      details,
      batchProcessed: batch.length,
      total,
      offset,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      syncedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Auto-price sync error:', error);
    return NextResponse.json({ error: error.message || 'Auto-price sync failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.enableAll) {
      await db.update(cards).set({ autoPrice: true });
      return NextResponse.json({ ok: true, message: 'Auto-pricing enabled for all cards' });
    }

    if (body.setGlobalMarkup !== undefined) {
      const m = parseFloat(body.setGlobalMarkup);
      if (!isNaN(m)) {
        await db.update(cards).set({ priceMarkup: m.toFixed(2) });
        return NextResponse.json({ ok: true, message: `Markup set to ${m}% for all cards` });
      }
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
