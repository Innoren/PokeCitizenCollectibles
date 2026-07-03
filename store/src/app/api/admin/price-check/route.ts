import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { isNotNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

interface PriceAlert {
  id: number;
  name: string;
  sku: string | null;
  yourPrice: string;
  marketPrice: number | null;
  difference: string;
  status: 'above' | 'below' | 'fair';
}

export async function GET() {
  try {
    // Get all cards that have a SKU (so we can look them up)
    const allCards = await db
      .select()
      .from(cards)
      .where(isNotNull(cards.sku));

    const alerts: PriceAlert[] = [];

    for (const card of allCards) {
      if (!card.sku) continue;

      try {
        const res = await fetch(`${POKEMON_TCG_API}/cards/${card.sku}`, {
          headers: { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY || '' },
        });

        if (!res.ok) continue;

        const data = await res.json();
        const tcgCard = data.data;

        // Get market price from TCGPlayer data
        const marketPrice =
          tcgCard?.tcgplayer?.prices?.holofoil?.market ||
          tcgCard?.tcgplayer?.prices?.normal?.market ||
          tcgCard?.tcgplayer?.prices?.reverseHolofoil?.market ||
          tcgCard?.cardmarket?.prices?.averageSellPrice ||
          null;

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
        });
      } catch {
        continue;
      }
    }

    // Sort: items priced below market first (you're leaving money on the table)
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
