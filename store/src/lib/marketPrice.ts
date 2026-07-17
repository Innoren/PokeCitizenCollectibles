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

/** Fetch with a hard timeout so a single slow request can't hang the batch. */
async function fetchWithTimeout(url: string, ms = 3500): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { headers: apiHeaders(), signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

export type PriceReason = 'ok' | 'not_found' | 'no_price';

export interface PriceResult {
  price: number | null;
  reason: PriceReason;
}

/** Returns true if the SKU matches the Pokemon TCG API id format (e.g. "swsh3-20"). */
function isApiId(sku: string): boolean {
  return /^[a-zA-Z0-9]+-\d+[a-zA-Z]*$/.test(sku);
}

/** Strip parenthetical qualifiers like "(Alternate Art)" / "(JP)" and set-code suffixes. */
function cleanCardName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '') // remove (...) qualifiers
    .replace(/-\s*[A-Z]{2}\d+-\d+.*$/i, '') // remove trailing "- OP14-069" style codes
    .replace(/["\\]/g, '')
    .trim();
}

/** Extract the card number from a SKU like "159/086", "084/217", or bare "159" -> "159". */
function cardNumber(sku: string | null): string | null {
  if (!sku) return null;
  // Leading digits (handles "159/086", "159", "159a"); ignores letter-prefixed
  // codes like "OP14-069" (non-Pokémon), which correctly return null.
  const m = sku.trim().match(/^(\d+)/);
  if (!m) return null;
  return m[1].replace(/^0+/, '') || '0'; // strip leading zeros
}

async function searchCards(q: string): Promise<any[] | null> {
  const res = await fetchWithTimeout(
    `${POKEMON_TCG_API}/cards?q=${encodeURIComponent(q)}&pageSize=20&orderBy=-set.releaseDate`
  );
  if (!res || !res.ok) return null;
  try {
    const data = await res.json();
    return data.data || [];
  } catch {
    return null;
  }
}

/**
 * Resolves a market price and explains the outcome:
 *  - ok        : a market price was found
 *  - not_found : the card name matched nothing (likely non-Pokemon, e.g. One Piece)
 *  - no_price  : the card exists but no TCGPlayer market price is available yet
 */
export async function resolveMarketPriceDetailed(card: CardLike): Promise<PriceResult> {
  const cleanName = cleanCardName(card.name);
  if (!cleanName) return { price: null, reason: 'not_found' };

  const num = cardNumber(card.sku);
  let anyResultsFound = false;

  // Helper: only accept a result if its number matches ours (when we have one).
  const acceptResult = (r: any): number | null => {
    if (num) {
      const apiNum = String(r.number || '').replace(/^0+/, '');
      if (apiNum !== num) return null; // WRONG PRINTING — reject
    }
    return extractMarketPrice(r);
  };

  // 1) name + number (most precise — pins exact printing)
  if (num) {
    const results = await searchCards(`name:"${cleanName}" number:${num}`);
    if (results && results.length > 0) {
      anyResultsFound = true;
      // Prefer set match.
      if (card.setName) {
        const setNorm = card.setName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const setMatch = results.find((r) => {
          const apiSet = (r.set?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return (apiSet.includes(setNorm) || setNorm.includes(apiSet)) && acceptResult(r) !== null;
        });
        if (setMatch) { const p = acceptResult(setMatch); if (p !== null) return { price: p, reason: 'ok' }; }
      }
      // Any exact number match.
      for (const r of results) { const p = acceptResult(r); if (p !== null) return { price: p, reason: 'ok' }; }
    }
  }

  // 2) name + set (only when we DON'T have a number — otherwise step 1 is the only valid path)
  if (!num && card.setName) {
    const results = await searchCards(
      `name:"${cleanName}" set.name:"${card.setName.replace(/["\\]/g, '')}"`
    );
    if (results && results.length > 0) {
      anyResultsFound = true;
      for (const r of results) {
        const price = extractMarketPrice(r);
        if (price !== null) return { price, reason: 'ok' };
      }
    }
  }

  // If we have a number and found results but no price, it's "no_price".
  // If we have no number and no set matched, try name+set as last attempt.
  if (num && card.setName && !anyResultsFound) {
    const results = await searchCards(
      `name:"${cleanName}" set.name:"${card.setName.replace(/["\\]/g, '')}"`
    );
    if (results && results.length > 0) {
      anyResultsFound = true;
      for (const r of results) { const p = acceptResult(r); if (p !== null) return { price: p, reason: 'ok' }; }
    }
  }

  // NO name-only fallback. NO returning a price from the wrong collector number.
  return { price: null, reason: anyResultsFound ? 'no_price' : 'not_found' };
}

/** Back-compat: returns just the price (or null). */
export async function resolveMarketPrice(card: CardLike): Promise<number | null> {
  const { price } = await resolveMarketPriceDetailed(card);
  return price;
}
