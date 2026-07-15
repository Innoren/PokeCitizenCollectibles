import { NextRequest, NextResponse } from 'next/server';
import { resolveMarketPriceDetailed } from '@/lib/marketPrice';
import { resolveSealedPrice } from '@/lib/sealedPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

function apiHeaders(): HeadersInit {
  const key = process.env.POKEMON_TCG_API_KEY;
  return key ? { 'X-Api-Key': key } : {};
}

function extractMarketPrice(tcgCard: any): number | null {
  const p = tcgCard?.tcgplayer?.prices;
  const c =
    p?.holofoil?.market ?? p?.normal?.market ?? p?.reverseHolofoil?.market ??
    p?.['1stEditionHolofoil']?.market ?? p?.unlimitedHolofoil?.market ??
    p?.holofoil?.mid ?? p?.normal?.mid ?? tcgCard?.cardmarket?.prices?.averageSellPrice ?? null;
  return typeof c === 'number' && c > 0 ? c : null;
}

async function search(q: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(q)}&pageSize=20&orderBy=-set.releaseDate`,
      { headers: apiHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

/**
 * POST /api/admin/identify  — FREE identification (no paid AI).
 *
 * The browser OCRs the card image (Tesseract) and sends us the best guess of
 * the card name and collector number. We match it against the Pokémon TCG API
 * to get the canonical card (name, set, number, rarity, image) and a price via
 * our existing pricing system.
 *
 * Body: { nameGuess?: string, number?: string, rawText?: string, isSealed?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nameGuess: string = (body.nameGuess || '').trim();
    const number: string = (body.number || '').trim();
    const isSealed: boolean = !!body.isSealed;

    // Sealed products: match via TCGCSV using the OCR'd name.
    if (isSealed && nameGuess) {
      const price = await resolveSealedPrice({ name: nameGuess, setName: body.setGuess || '' });
      return NextResponse.json({
        card: {
          name: nameGuess,
          setName: body.setGuess || '',
          number: '',
          rarity: 'Sealed Product',
          variant: 'Normal',
          condition: 'Factory Sealed',
          imageUrl: '',
          marketPrice: price !== null ? price.toFixed(2) : null,
          matched: price !== null,
        },
      });
    }

    // Build candidate queries, most precise first.
    const cleanName = nameGuess.replace(/["\\]/g, '').trim();
    const candidates: any[] = [];

    if (cleanName && number) {
      const r = await search(`name:"${cleanName}" number:${number}`);
      candidates.push(...r);
    }
    if (candidates.length === 0 && cleanName) {
      const r = await search(`name:"${cleanName}"`);
      candidates.push(...r);
    }
    if (candidates.length === 0 && number) {
      // Number alone isn't unique, but try it as a last resort.
      const r = await search(`number:${number}`);
      candidates.push(...r);
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        card: {
          name: nameGuess || 'Unknown Card',
          setName: '', number, rarity: '', variant: 'Normal',
          condition: 'Near Mint', imageUrl: '', marketPrice: null, matched: false,
        },
      });
    }

    // Prefer a candidate that has a market price; else the first result.
    let chosen = candidates.find((c) => extractMarketPrice(c) !== null) || candidates[0];
    let marketPrice = extractMarketPrice(chosen);

    // Fallback pricing through our own resolver (covers reprints without price).
    if (marketPrice === null) {
      const pr = await resolveMarketPriceDetailed({
        sku: chosen.number || number || null,
        name: chosen.name,
        setName: chosen.set?.name || '',
      });
      marketPrice = pr.price;
    }

    return NextResponse.json({
      card: {
        name: chosen.name || nameGuess,
        setName: chosen.set?.name || '',
        number: chosen.number || number,
        rarity: chosen.rarity || '',
        variant: chosen.rarity && /holo|reverse/i.test(chosen.rarity) ? 'Holofoil' : 'Normal',
        condition: 'Near Mint',
        imageUrl: chosen.images?.small || chosen.images?.large || '',
        marketPrice: marketPrice !== null ? marketPrice.toFixed(2) : null,
        matched: true,
      },
    });
  } catch (error: any) {
    console.error('Identify error:', error);
    return NextResponse.json({ error: error.message || 'Identify failed' }, { status: 500 });
  }
}
