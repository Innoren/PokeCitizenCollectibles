/**
 * Import cards from Collectr CSV export into the store database.
 * Run with: npm run db:import
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { cards } from './schema';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(__dirname, '../../.env.local') });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((l) => l.trim());
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

function mapRarity(rarity: string): string {
  const map: Record<string, string> = {
    'C': 'Common',
    'U': 'Uncommon',
    'R': 'Rare',
    'RR': 'Rare',
    'SR': 'Ultra Rare',
    'SEC': 'Secret Rare',
    'L': 'Rare',
    'SAR': 'Secret Rare',
    'UR': 'Ultra Rare',
    'AR': 'Ultra Rare',
    'ACE': 'Ultra Rare',
    'SP': 'Ultra Rare',
    'AA': 'Ultra Rare',
    'P': 'Rare',
    'IR': 'Ultra Rare',
    'SIR': 'Secret Rare',
    'HIR': 'Secret Rare',
  };
  return map[rarity.toUpperCase()] || rarity || 'Rare';
}

function mapCondition(condition: string): string {
  const map: Record<string, string> = {
    'Near Mint': 'Near Mint',
    'Lightly Played': 'Excellent',
    'Moderately Played': 'Good',
    'Heavily Played': 'Played',
    'Damaged': 'Played',
    'Mint': 'Mint',
  };
  return map[condition] || 'Near Mint';
}

function isSealed(name: string): boolean {
  const sealedKeywords = ['Booster Box', 'Booster Bundle', 'Elite Trainer Box', 'ETB', 'Collection Box', 'Tin', 'Blister', 'Bundle', 'Pin Collection', 'ex Box', 'Deck Box', 'Pack', 'Display'];
  return sealedKeywords.some((kw) => name.toLowerCase().includes(kw.toLowerCase()));
}

async function main() {
  const csvPath = resolve(__dirname, '../../export.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);

  console.log(`📦 Found ${rows.length} items in CSV`);

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row['Product Name'];
    const set = row['Set'] || '';
    const rarity = row['Rarity'] || '';
    const condition = row['Card Condition'] || 'Near Mint';
    const quantity = parseInt(row['Quantity'], 10) || 1;
    const marketPrice = parseFloat(row['Market Price (As of 2026-06-03)']) || 0;
    const cardNumber = row['Card Number'] || '';
    const variance = row['Variance'] || '';

    if (!name) {
      skipped++;
      continue;
    }

    // Skip items with $0 market price (can't sell them without a price)
    if (marketPrice <= 0) {
      console.log(`  ⏭ Skipping "${name}" — no market price`);
      skipped++;
      continue;
    }

    const sealed = isSealed(name);

    await db.insert(cards).values({
      sku: cardNumber || null,
      name: name,
      setName: set,
      rarity: sealed ? 'Sealed Product' : mapRarity(rarity),
      condition: sealed ? 'Factory Sealed' : mapCondition(condition),
      price: marketPrice.toFixed(2),
      imageUrl: '', // No image in CSV — you can add later via admin
      description: variance ? `Variant: ${variance}` : null,
      stock: quantity,
    });

    imported++;
    console.log(`  ✓ ${name} (${set}) — $${marketPrice.toFixed(2)} x${quantity}`);
  }

  console.log(`\n✅ Import complete: ${imported} imported, ${skipped} skipped`);
}

main().catch(console.error);
