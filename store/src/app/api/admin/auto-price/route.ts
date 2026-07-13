import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { resolveMarketPriceDetailed } from '@/lib/marketPrice';
import { resolveSealedPrice } from '@/lib/sealedPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    }

    if (market === null) {
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
    // ── CRON / FULL RUN (self-chaining) ──────────────────────────────
    // Vercel hits this once at midnight (with ?cron=1). Each invocation
    // processes as many cards as it can within a safe time budget, then
    // triggers the next chunk so the whole catalog gets done without any
    // single invocation exceeding Vercel's 60s limit.
    if (isCron) {
      const CONCURRENCY = 20;
      const TIME_BUDGET_MS = 40000; // stay well under the 60s hard limit
      const start = Date.now();

      const totalRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(cards)
        .where(eq(cards.autoPrice, true));
      const total = Number(totalRes[0].count);

      let offset = parseInt(params.get('offset') || '0', 10);
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      let processed = 0;

      while (offset < total && Date.now() - start < TIME_BUDGET_MS) {
        const chunk = await db
          .select()
          .from(cards)
          .where(eq(cards.autoPrice, true))
          .orderBy(cards.id)
          .limit(CONCURRENCY)
          .offset(offset);
        if (chunk.length === 0) break;

        const results = await processConcurrently(chunk, globalMarkup, CONCURRENCY);
        updated += results.filter((r) => r.status === 'updated').length;
        skipped += results.filter((r) => r.status === 'skipped').length;
        failed += results.filter((r) => r.status === 'failed').length;
        offset += chunk.length;
        processed += chunk.length;
      }

      const hasMore = offset < total;
      if (hasMore) {
        // Fire-and-forget the next chunk. We only need Vercel to accept the
        // request; the spawned invocation runs independently of this one.
        const markupQ = markupOverride !== null ? `&markup=${markupOverride}` : '';
        const nextUrl = `${request.nextUrl.origin}/api/admin/auto-price?cron=1&offset=${offset}${markupQ}`;
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 2500);
        fetch(nextUrl, {
          headers: auth ? { Authorization: auth } : {},
          signal: ctrl.signal,
        }).catch(() => {});
        // Give Vercel a moment to receive and start the next invocation.
        await new Promise((r) => setTimeout(r, 1500));
      }

      return NextResponse.json({
        ok: true,
        mode: 'cron',
        total,
        processedThisRun: processed,
        updated,
        skipped,
        failed,
        offset,
        hasMore,
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
