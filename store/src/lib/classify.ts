/**
 * Auto-classifies a product as a "Single Card" or "Sealed Product"
 * based on its name, product type, and rarity.
 *
 * This runs on every product added so the storefront can automatically
 * distribute items into the right sections without manual sorting.
 */

export type ProductCategory = 'Single Card' | 'Sealed Product';

// Keywords that strongly indicate a sealed / boxed product
const SEALED_KEYWORDS = [
  'booster box',
  'booster pack',
  'booster bundle',
  'elite trainer box',
  'etb',
  'collection box',
  'premium collection',
  'ultra premium collection',
  'upc',
  'build & battle',
  'build and battle',
  'battle deck',
  'theme deck',
  'starter deck',
  'tin',
  'blister',
  'sleeved booster',
  'booster',
  'bundle',
  'case',
  'display',
  'pack',
  'box set',
  'gift set',
  'collection',
  'mini tin',
  'poke ball tin',
  'pokeball tin',
];

// Product types (from the admin dropdown) that are always sealed
const SEALED_PRODUCT_TYPES = [
  'Booster Pack',
  'Elite Trainer Box',
  'Booster Box',
  'Collection Box',
  'Tin',
  'Blister Pack',
  'Bundle',
];

interface ClassifyInput {
  name?: string;
  productType?: string;
  rarity?: string;
  condition?: string;
}

/**
 * Determines whether a product is a Single Card or Sealed Product.
 */
export function classifyProduct(input: ClassifyInput): ProductCategory {
  const { name = '', productType = '', rarity = '', condition = '' } = input;

  // 1. Explicit product type from the admin form wins
  if (SEALED_PRODUCT_TYPES.includes(productType)) {
    return 'Sealed Product';
  }
  if (productType === 'Single Card') {
    return 'Single Card';
  }

  // 2. Explicit rarity / condition markers
  if (rarity.toLowerCase() === 'sealed product' || condition.toLowerCase() === 'factory sealed') {
    return 'Sealed Product';
  }

  // 3. Keyword detection on the product name
  const lowerName = name.toLowerCase();
  for (const keyword of SEALED_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      return 'Sealed Product';
    }
  }

  // 4. Default — treat as a single card
  return 'Single Card';
}
