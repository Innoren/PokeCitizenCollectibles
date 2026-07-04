import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq, isNotNull, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

/**
 * GET — Sync prices for all auto-priced cards.
 * Fetches current market prices from TCGPlayer via the Pokemon TCG API,
 * applies the per-card markup, and updates the price in the database.
 */
export async function GET() {
  try {
    // Get all cards with auto-price enabled and a SKU
    const autoCards = await db
      .select()
      .from(cards)
      .where(and(eq(cards.autoPrice, true), isNotNull(cards.sku)));

    const results: { id: number; name: string; oldPrice: string; newPrice: string; marketPrice: number; status: string }[] = [];
    let updated = 0;
    let failed = 0;

    for (const card of autoCards) {
      if (!card.sku) continue;

      try {
        const res = await fetch(`${POKEMON_TCG_API}/cards/${card.sku}`, {
          headers: { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY || '' },
        });

        if (!res.ok) {
          failed++;
          results.push({ id: card.id, name: card.name, oldPrice: card.price, newPrice: card.price, marketPrice: 0, status: 'api_error' });
          continue;
        }

        const data = await res.json();
        const tcgCard = data.data;

        const marketPrice =
          tcgCard?.tcgplayer?.prices?.holofoil?.market ||
          tcgCard?.tcgplayer?.prices?.normal?.market ||
          tcgCard?.tcgplayer?.prices?.reverseHolofoil?.market ||
          tcgCard?.cardmarket?.prices?.averageSellPrice ||
          null;

        if (marketPrice === null) {
          failed++;
          results.push({ id: card.id, name: card.name, oldPrice: card.price, newPrice: card.price, marketPrice: 0, status: 'no_market_data' });
          continue;
        }

        // Apply markup
        const markup = parseFloat(card.priceMarkup || '10');
        const newPrice = marketPrice * (1 + markup / 100);
        const formattedPrice = newPrice.toFixed(2);

        // Update the card price
        await db.update(cards).set({
          price: formattedPrice,
          lastMarketPrice: String(marketPrice),
          lastPriceSync: new Date(),
        }).where(eq(cards.id, card.id));

        updated++;
        results.push({
          id: card.id,
          name: card.name,
          oldPrice: card.price,
          newPrice: formattedPrice,
          marketPrice,
          status: 'updated',
        });
      } catch {
        failed++;
        results.push({ id: card.id, name: card.name, oldPrice: card.price, newPrice: card.price, marketPrice: 0, status: 'error' });
      }
    }

    return NextResponse.json({
      updated,
      failed,
      total: autoCards.length,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Auto-price sync error:', error);
    return NextResponse.json({ error: 'Auto-price sync failed' }, { status: 500 });
  }
}

/**
 * POST — Toggle auto-price for a card and optionally set markup.
 * Body: { id: number, autoPrice: boolean, priceMarkup?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, autoPrice, priceMarkup } = body;

    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (autoPrice !== undefined) updates.autoPrice = autoPrice;
    if (priceMarkup !== undefined) updates.priceMarkup = String(priceMarkup);

    await db.update(cards).set(updates).where(eq(cards.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Auto-price toggle error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}
