/**
 * Backfills the `category` column for existing products by running them
 * through the auto-classifier. Run once after adding the category column:
 *   npx tsx --env-file=.env.local src/db/backfill-categories.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { cards } from './schema';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { classifyProduct } from '../lib/classify';

config({ path: resolve(__dirname, '../../.env.local') });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  console.log('Backfilling product categories...');
  const all = await db.select().from(cards);

  let updated = 0;
  for (const card of all) {
    const category = classifyProduct({
      name: card.name,
      rarity: card.rarity,
      condition: card.condition,
    });
    await db.update(cards).set({ category }).where(eq(cards.id, card.id));
    updated++;
    console.log(`  ${card.name} → ${category}`);
  }

  console.log(`\n✓ Categorized ${updated} product(s).`);
}

main().catch(console.error);
