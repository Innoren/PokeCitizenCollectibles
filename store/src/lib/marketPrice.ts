/**
 * Resolves the current TCGPlayer market price for a card using the free
 * Pokemon TCG API (https://pokemontcg.io), which embeds TCGPlayer pricing.
 *
 * Robust to different SKU formats:
 *   1. If the SKU looks like a Pokemon TCG API id (e.g. "sv1-25"), look up directly.
 *   2. Otherwise (or on miss), search by card name, preferring a matching set.
 *
 * Returns the market price as a number, or null if none could be found.
 */

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

function apiHeaders(): HeadersInit {
  const key = process.env.POKEMON_TCG_API_KEY;
  return key ? { 'X-Api-Key': key } : {};
}

/** Extract the best available TCGPlayer market price from an API card object. */
export function extractMarketPrice(tcgCard: any): number | null {
  const p = tcgCard?.tcgplayer?.prices;
  const candidate =
    p?.holofoil?.market ??
    p?.normal?.market ??
    p?.reverseHolofoil?.market ??
    p?.['1stEditionHolofoil']?.market ??
    p?.unlimitedHolofoil?.market ??
    // Fall back to mid/direct if market is missing
    p?.holofoil?.mid ??
    p?.normal?.mid ??
    p?.reverseHolofoil?.mid ??
    // Cardmarket as a last resort
    tcgCard?.cardmarket?.prices?.averageSellPrice ??
    null;
  return typeof candidate === 'number' && candidate > 0 ? candidate : null;
}

interface CardLike {
  sku: string | null;
  name: string;
  setName?: string | null;
}

/** Returns true if the SKU matches the Pokemon TCG API id format (e.g. "swsh3-20"). */
function isApiId(sku: string): boolean {
  return /^[a-zA-Z0-9]+-\d+[a-zA-Z]*$/.test(sku);
}

export async function resolveMarketPrice(card: CardLike): Promise<number | null> {
  // 1) Direct id lookup when the SKU is a valid API id.
  if (card.sku && isApiId(card.sku)) {
    try {
      const res = await fetch(`${POKEMON_TCG_API}/cards/${encodeURIComponent(card.sku)}`, {
        headers: apiHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const price = extractMarketPrice(data.data);
        if (price !== null) return price;
      }
    } catch {
      /* fall through to name search */
    }
  }

  // 2) Search by name (and set, when available) — handles collector-number SKUs.
  const cleanName = card.name.replace(/["\\]/g, '').trim();
  if (!cleanName) return null;

  const queries: string[] = [];
  if (card.setName) {
    queries.push(`name:"${cleanName}" set.name:"${card.setName.replace(/["\\]/g, '')}"`);
  }
  queries.push(`name:"${cleanName}"`);

  for (const q of queries) {
    try {
      const res = await fetch(
        `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(q)}&pageSize=5&orderBy=-set.releaseDate`,
        { headers: apiHeaders() }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const results: any[] = data.data || [];
      // Pick the first result that actually has a usable market price.
      for (const r of results) {
        const price = extractMarketPrice(r);
        if (price !== null) return price;
      }
    } catch {
      continue;
    }
  }

  return null;
}
