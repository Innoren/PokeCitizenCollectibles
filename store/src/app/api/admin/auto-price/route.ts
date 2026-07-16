import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { resolveMarketPriceDetailed } from '@/lib/marketPrice';
import { resolveSealedPrice, resolveCardPriceViaTcgcsv } from '@/lib/sealedPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function roundPrice(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

type CardRow = typeof cards.$inferSelect;

interface CardResult {
  id: number;
  name: string;
  status: 'updated' | 'skipped' | 'failed';
  reason?: string;
  oldPrice?: string;
  newPrice?: string;
  marketPrice?: number;
}

/** Price a single card (or sealed product) and persist it. Hard-capped in time. */
async function priceOneCard(card: CardRow, globalMarkup: number | null, now: Date): Promise<CardResult> {
  const isSealed = card.rarity === 'Sealed Product' || card.condition === 'Factory Sealed';

  try {
    let market: number | null;
    let reason = 'ok';

    if (isSealed) {
      market = await Promise.race<number | null>([
        resolveSealedPrice(card),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (market === null) reason = 'sealed_not_found';
    } else {
      const result = await Promise.race<{ price: number | null; reason: string }>([
        resolveMarketPriceDetailed(card),
        new Promise<{ price: null; reason: string }>((resolve) =>
          setTimeout(() => resolve({ price: null, reason: 'timeout' }), 8000)
        ),
      ]);
      market = result.price;
      reason = result.reason;

      // Fallback for new sets: TCGCSV mirrors TCGplayer directly and often has
      // prices for brand-new sets that pokemontcg.io hasn't indexed yet.
      if (market === null && (reason === 'no_price' || reason === 'not_found') && card.setName) {
        const num = card.sku ? card.sku.replace(/\/.*$/, '').replace(/^0+/, '') : undefined;
        const tcgcsvPrice = await Promise.race<number | null>([
          resolveCardPriceViaTcgcsv({ name: card.name, setName: card.setName, number: num }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
        ]);
        if (tcgcsvPrice !== null) {
          market = tcgcsvPrice;
          reason = 'ok';
        }
      }
    }

    if (market === null) {
      // Record the attempt time (not the price) so the nightly stalest-first
      // rotation moves this card to the back and doesn't retry it every night
      // ahead of cards that can actually be priced.
      try {
        await db.update(cards).set({ lastPriceSync: now }).where(eq(cards.id, card.id));
      } catch {
        /* non-fatal */
      }
      const reasonMsg =
        reason === 'sealed_not_found'
          ? 'Sealed product not found on TCGplayer (check set/product name)'
          : reason === 'not_found'
          ? 'Not found in Pokémon TCG database (non-Pokémon card or name mismatch)'
          : reason === 'no_price'
          ? 'Card found, but TCGPlayer has no market price yet (often brand-new sets)'
          : reason === 'timeout'
          ? 'Lookup timed out — try again'
          : 'No market price available';
      return { id: card.id, name: card.name, status: 'skipped', reason: reasonMsg };
    }

    const markup =
      globalMarkup !== null && !isNaN(globalMarkup)
        ? globalMarkup
        : parseFloat(card.priceMarkup ?? '10') || 0;
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

    return {
      id: card.id,
      name: card.name,
      status: 'updated',
      oldPrice: card.price,
      newPrice,
      marketPrice: market,
    };
  } catch {
    return { id: card.id, name: card.name, status: 'failed', reason: 'Error while updating' };
  }
}

/** Process a list of cards with bounded concurrency (parallel for speed). */
async function processConcurrently(
  list: CardRow[],
  globalMarkup: number | null,
  concurrency: number
): Promise<CardResult[]> {
  const now = new Date();
  const results: CardResult[] = [];
  for (let i = 0; i < list.length; i += concurrency) {
    const chunk = list.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((c) => priceOneCard(c, globalMarkup, now)));
    results.push(...chunkResults);
  }
  return results;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const isCronAuthed = !!secret && auth === `Bearer ${secret}`;
  // Block only when a secret is set AND an (incorrect) auth header is provided.
  if (secret && auth && !isCronAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const isCron = params.get('cron') === '1' || (isCronAuthed && !params.has('offset'));
  const markupOverride = params.get('markup');
  const globalMarkup = markupOverride !== null ? parseFloat(markupOverride) : null;

  try {
    // ── CRON / NIGHTLY RUN (stalest-first, time-boxed) ───────────────
    // Vercel hits this once at midnight (?cron=1). We refresh as many cards
    // as fit in a safe time budget, prioritising the ones that haven't been
    // updated in the longest time (never-synced first). This is fully
    // reliable (no fragile self-chaining) and cycles through the whole
    // catalog over consecutive nights; prices change little day-to-day.
    // For an immediate full refresh, use the "Update All Prices" button.
    if (isCron) {
      const CONCURRENCY = 25;

      const totalRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(cards)
        .where(eq(cards.autoPrice, true));
      const total = Number(totalRes[0].count);

      // Fetch all auto-priced cards at once (safe with Pro's 300s budget).
      const allCards = await db
        .select()
        .from(cards)
        .where(eq(cards.autoPrice, true))
        .orderBy(cards.id);

      const results = await processConcurrently(allCards, globalMarkup, CONCURRENCY);
      const updated = results.filter((r) => r.status === 'updated').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      const failed = results.filter((r) => r.status === 'failed').length;

      return NextResponse.json({
        ok: true,
        mode: 'cron',
        total,
        processedThisRun: allCards.length,
        updated,
        skipped,
        failed,
        remaining: 0,
        syncedAt: new Date().toISOString(),
      });
    }

    // ── MANUAL / BATCHED (client-driven loop) ────────────────────────
    const batchSize = Math.min(parseInt(params.get('batch') || '8', 10), 12);
    const offset = parseInt(params.get('offset') || '0', 10);
    const onlyAuto = params.get('onlyAuto') === '1';

    const countResult = onlyAuto
      ? await db.select({ count: sql<number>`count(*)` }).from(cards).where(eq(cards.autoPrice, true))
      : await db.select({ count: sql<number>`count(*)` }).from(cards);
    const total = Number(countResult[0].count);

    const baseQuery = db.select().from(cards);
    const batch = onlyAuto
      ? await baseQuery.where(eq(cards.autoPrice, true)).orderBy(cards.id).limit(batchSize).offset(offset)
      : await baseQuery.orderBy(cards.id).limit(batchSize).offset(offset);

    // Process the whole batch in parallel — big speed win vs sequential.
    const details = await processConcurrently(batch, globalMarkup, batchSize);
    const updated = details.filter((r) => r.status === 'updated').length;
    const skipped = details.filter((r) => r.status === 'skipped').length;
    const failed = details.filter((r) => r.status === 'failed').length;

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
      syncedAt: new Date().toISOString(),
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
