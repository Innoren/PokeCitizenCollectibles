import { NextRequest, NextResponse } from 'next/server';

/**
 * Looks up a Pokemon card by its set code + number (SKU).
 * 
 * SKU format examples:
 *   - "swsh3-20"  (Darkness Ablaze #20)
 *   - "sv1-25"   (Scarlet & Violet #25)
 *   - "base1-4"  (Base Set #4 - Charizard)
 * 
 * Also supports plain text search if the SKU doesn't match a known format.
 * Uses the free Pokemon TCG API: https://pokemontcg.io
 */

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku')?.trim();

  if (!sku) {
    return NextResponse.json({ error: 'SKU parameter is required' }, { status: 400 });
  }

  try {
    let card = null;

    // Try direct ID lookup first (format: setCode-number, e.g. "swsh3-20")
    if (/^[a-zA-Z0-9]+-\d+$/.test(sku)) {
      const res = await fetch(`${POKEMON_TCG_API}/cards/${sku}`, {
        headers: { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY || '' },
      });
      if (res.ok) {
        const data = await res.json();
        card = data.data;
      }
    }

    // If direct lookup failed, try searching by number + set
    if (!card) {
      // Try as a search query (card name or number)
      const query = encodeURIComponent(`name:"${sku}" OR number:"${sku}"`);
      const res = await fetch(`${POKEMON_TCG_API}/cards?q=${query}&pageSize=1`, {
        headers: { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY || '' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          card = data.data[0];
        }
      }
    }

    if (!card) {
      return NextResponse.json(
        { error: `No card found for SKU: "${sku}"` },
        { status: 404 }
      );
    }

    // Map to our format
    const result = {
      sku: card.id,
      name: card.name,
      setName: card.set?.name || '',
      rarity: card.rarity || 'Common',
      imageUrl: card.images?.large || card.images?.small || '',
      description: `${card.set?.name || ''} #${card.number || ''} — ${card.supertype || ''} ${card.subtypes?.join(', ') || ''}`.trim(),
      // Market price from TCGPlayer if available
      suggestedPrice: card.tcgplayer?.prices?.holofoil?.market
        || card.tcgplayer?.prices?.normal?.market
        || card.tcgplayer?.prices?.reverseHolofoil?.market
        || card.cardmarket?.prices?.averageSellPrice
        || null,
    };

    return NextResponse.json({ card: result });
  } catch (error: any) {
    console.error('Pokemon TCG API lookup failed:', error);
    return NextResponse.json(
      { error: 'Lookup failed. Try again or enter details manually.' },
      { status: 500 }
    );
  }
}
