import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TCGCSV_BASE = 'https://tcgcsv.com/tcgplayer/3';
const UA = { 'User-Agent': 'PokeCitizenCollectibles/1.0 (store auto-pricing)' };

/**
 * GET /api/admin/set-catalog?set=Ascended+Heroes
 *
 * Returns all cards (with prices) in a specific TCGplayer set via TCGCSV.
 * Used by the bulk scanner to let users pick cards from a dropdown instead of OCR.
 */
export async function GET(request: NextRequest) {
  const setName = request.nextUrl.searchParams.get('set');
  if (!setName) {
    return NextResponse.json({ error: 'set parameter required' }, { status: 400 });
  }

  try {
    // Find the matching group.
    const groupsRes = await fetch(`${TCGCSV_BASE}/groups`, { headers: UA });
    if (!groupsRes.ok) throw new Error('Failed to fetch groups');
    const groups: any[] = (await groupsRes.json()).results || [];

    const target = setName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const stripPrefix = (n: string) => n.replace(/^[A-Z0-9]{1,5}:\s*/i, '').trim();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    let group = groups.find((g) => norm(stripPrefix(g.name)) === target);
    if (!group) group = groups.find((g) => norm(stripPrefix(g.name)).includes(target));
    if (!group) group = groups.find((g) => target.includes(norm(stripPrefix(g.name))));

    if (!group) {
      return NextResponse.json({ error: `Set "${setName}" not found`, cards: [] });
    }

    // Fetch products + prices for this set.
    const [prodRes, priceRes] = await Promise.all([
      fetch(`${TCGCSV_BASE}/${group.groupId}/products`, { headers: UA }),
      fetch(`${TCGCSV_BASE}/${group.groupId}/prices`, { headers: UA }),
    ]);
    if (!prodRes.ok || !priceRes.ok) throw new Error('Failed to fetch set data');

    const products: any[] = (await prodRes.json()).results || [];
    const prices: any[] = (await priceRes.json()).results || [];

    // Build a price map (productId -> best price).
    const priceMap = new Map<number, { market: number | null; mid: number | null; subType: string }>();
    for (const p of prices) {
      const existing = priceMap.get(p.productId);
      // Prefer the Holofoil/Normal subtype entry with the best price.
      if (!existing || (p.marketPrice && (!existing.market || p.marketPrice < existing.market))) {
        priceMap.set(p.productId, {
          market: p.marketPrice || null,
          mid: p.midPrice || null,
          subType: p.subTypeName || '',
        });
      }
    }

    // Build card list.
    const cards = products.map((prod) => {
      const pr = priceMap.get(prod.productId);
      // Extract number from product name if present (e.g. "Regice ex - 048/217" -> "48")
      const numMatch = prod.name.match(/(\d{1,3})\s*\/\s*\d{1,3}/);
      const number = numMatch ? numMatch[1].replace(/^0+/, '') || '0' : (prod.number || '');
      return {
        name: prod.name.replace(/\s*-\s*\d+\/\d+.*$/, '').trim(),
        fullName: prod.name,
        number,
        marketPrice: pr?.market ?? pr?.mid ?? null,
        subType: pr?.subType || '',
        productId: prod.productId,
      };
    }).filter((c) => c.marketPrice !== null || c.name) // keep all, even unpriced
      .sort((a, b) => {
        const na = parseInt(a.number) || 9999;
        const nb = parseInt(b.number) || 9999;
        return na - nb;
      });

    return NextResponse.json({
      setName: stripPrefix(group.name),
      groupId: group.groupId,
      totalCards: cards.length,
      cards,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load set' }, { status: 500 });
  }
}
