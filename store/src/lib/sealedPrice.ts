/**
 * Sealed-product pricing via TCGCSV (a free, no-auth mirror of TCGplayer's
 * catalog — https://tcgcsv.com). Unlike the Pokémon TCG API, this includes
 * Elite Trainer Boxes, Booster Boxes, Bundles, Tins, etc.
 *
 * Pokémon is category 3 on TCGplayer.
 */

const TCGCSV_BASE = 'https://tcgcsv.com/tcgplayer/3';
const UA = { 'User-Agent': 'PokeCitizenCollectibles/1.0 (store auto-pricing)' };

interface Group {
  groupId: number;
  name: string;
}

// Module-level caches (persist within a warm serverless instance).
let groupsCache: Group[] | null = null;
const groupProductsCache = new Map<number, Map<string, number>>(); // groupId -> (normalizedName -> marketPrice)

async function fetchJson(url: string, ms = 5000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { headers: UA, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** TCGCSV group names are prefixed like "SV: White Flare" / "ME03: Perfect Order". */
function stripGroupPrefix(name: string): string {
  return name.replace(/^[A-Z0-9]{1,5}:\s*/i, '').trim();
}

async function getGroups(): Promise<Group[]> {
  if (groupsCache) return groupsCache;
  const data = await fetchJson(`${TCGCSV_BASE}/groups`);
  groupsCache = (data?.results as Group[]) || [];
  return groupsCache;
}

/** Find the TCGplayer group whose (prefix-stripped) name matches the store set. */
async function findGroupId(setName: string): Promise<number | null> {
  const groups = await getGroups();
  const target = normalize(setName);
  if (!target) return null;

  // Exact match on stripped name first, then contains.
  let match = groups.find((g) => normalize(stripGroupPrefix(g.name)) === target);
  if (!match) match = groups.find((g) => normalize(stripGroupPrefix(g.name)).includes(target));
  if (!match) match = groups.find((g) => target.includes(normalize(stripGroupPrefix(g.name))));
  return match ? match.groupId : null;
}

/** Build (and cache) a name->marketPrice map for a group's products. */
async function getGroupPriceMap(groupId: number): Promise<Map<string, number>> {
  const cached = groupProductsCache.get(groupId);
  if (cached) return cached;

  const [productsData, pricesData] = await Promise.all([
    fetchJson(`${TCGCSV_BASE}/${groupId}/products`),
    fetchJson(`${TCGCSV_BASE}/${groupId}/prices`),
  ]);

  const map = new Map<string, number>();
  const prices = new Map<number, number>();
  for (const p of pricesData?.results || []) {
    const val = p.marketPrice ?? p.midPrice ?? null;
    if (typeof val === 'number' && val > 0) prices.set(p.productId, val);
  }
  for (const prod of productsData?.results || []) {
    const price = prices.get(prod.productId);
    if (price != null) map.set(normalize(prod.name), price);
  }

  groupProductsCache.set(groupId, map);
  return map;
}

/**
 * Resolve a sealed product's market price by matching its name within the
 * matching TCGplayer group. Returns null if not found.
 */
export async function resolveSealedPrice(card: {
  name: string;
  setName?: string | null;
}): Promise<number | null> {
  if (!card.setName) return null;

  const groupId = await findGroupId(card.setName);
  if (groupId === null) return null;

  const priceMap = await getGroupPriceMap(groupId);
  if (priceMap.size === 0) return null;

  const target = normalize(card.name);

  // Exact match first.
  if (priceMap.has(target)) return priceMap.get(target)!;

  // Otherwise, best contains-match (prefer the shortest matching product name
  // to avoid grabbing "... Case" / "... Display" bulk variants).
  let best: { name: string; price: number } | null = null;
  Array.from(priceMap.entries()).forEach(([name, price]) => {
    if (name.includes(target) || target.includes(name)) {
      if (!best || name.length < best.name.length) best = { name, price };
    }
  });
  return best ? (best as { name: string; price: number }).price : null;
}

/**
 * Resolve an individual card's market price from TCGCSV (TCGplayer mirror).
 * This handles brand-new sets that pokemontcg.io doesn't have pricing for yet.
 * TCGCSV gets pricing data faster since it mirrors TCGplayer directly.
 *
 * Matches by card name within the correct set group.
 */
export async function resolveCardPriceViaTcgcsv(card: {
  name: string;
  setName?: string | null;
}): Promise<number | null> {
  if (!card.setName) return null;

  const groupId = await findGroupId(card.setName);
  if (groupId === null) return null;

  const priceMap = await getGroupPriceMap(groupId);
  if (priceMap.size === 0) return null;

  // Clean the card name for matching (strip qualifiers, "ex" suffix variants, etc.).
  const target = normalize(card.name);

  // Exact match.
  if (priceMap.has(target)) return priceMap.get(target)!;

  // Fuzzy: find products whose name starts with our card name (handles
  // TCGCSV naming like "Regice ex - 048/217" matching "regice ex").
  let best: number | null = null;
  Array.from(priceMap.entries()).forEach(([name, price]) => {
    if (name.startsWith(target) || target.startsWith(name)) {
      // Prefer the closest length match (avoid "Regice ex Secret Rare" when we want "Regice ex").
      if (best === null) best = price;
    }
  });

  return best;
}
