import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { cards } from './schema';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from the store root
config({ path: resolve(__dirname, '../../.env.local') });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const sampleCards = [
  {
    name: 'Charizard VMAX',
    setName: 'Darkness Ablaze',
    rarity: 'Secret Rare',
    condition: 'Mint',
    price: '349.99',
    imageUrl: 'https://images.pokemontcg.io/swsh3/20_hires.png',
    description: 'The iconic Charizard VMAX in its Gigantamax form. One of the most sought-after cards in the modern era.',
    stock: 3,
  },
  {
    name: 'Pikachu VMAX',
    setName: 'Vivid Voltage',
    rarity: 'Ultra Rare',
    condition: 'Mint',
    price: '89.99',
    imageUrl: 'https://images.pokemontcg.io/swsh4/44_hires.png',
    description: 'Pikachu in its Gigantamax form, featuring stunning rainbow artwork and powerful VMAX attacks.',
    stock: 7,
  },
  {
    name: 'Mewtwo GX',
    setName: 'Shining Legends',
    rarity: 'Ultra Rare',
    condition: 'Near Mint',
    price: '45.99',
    imageUrl: 'https://images.pokemontcg.io/sm35/72_hires.png',
    description: 'The legendary psychic Pokemon Mewtwo in its powerful GX form with devastating attacks.',
    stock: 5,
  },
  {
    name: 'Umbreon VMAX',
    setName: 'Evolving Skies',
    rarity: 'Secret Rare',
    condition: 'Mint',
    price: '275.00',
    imageUrl: 'https://images.pokemontcg.io/swsh7/215_hires.png',
    description: 'The alternate art Umbreon VMAX, one of the most beautiful cards in the Sword & Shield era.',
    stock: 2,
  },
  {
    name: 'Rayquaza VMAX',
    setName: 'Evolving Skies',
    rarity: 'Ultra Rare',
    condition: 'Near Mint',
    price: '65.00',
    imageUrl: 'https://images.pokemontcg.io/swsh7/218_hires.png',
    description: 'Rayquaza soars through the skies in this stunning VMAX card with dragon-type attacks.',
    stock: 4,
  },
  {
    name: 'Gengar VMAX',
    setName: 'Fusion Strike',
    rarity: 'Ultra Rare',
    condition: 'Excellent',
    price: '35.50',
    imageUrl: 'https://images.pokemontcg.io/swsh8/271_hires.png',
    description: 'The mischievous ghost Pokemon Gengar in its Gigantamax form, haunting opponents with shadow attacks.',
    stock: 8,
  },
  {
    name: 'Blastoise EX',
    setName: 'Pokemon 151',
    rarity: 'Rare',
    condition: 'Mint',
    price: '28.99',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/186_hires.png',
    description: 'The classic water-type starter in its powerful EX form from the nostalgic Pokemon 151 set.',
    stock: 10,
  },
  {
    name: 'Eevee',
    setName: 'Evolving Skies',
    rarity: 'Common',
    condition: 'Near Mint',
    price: '2.50',
    imageUrl: 'https://images.pokemontcg.io/swsh7/120_hires.png',
    description: 'The beloved evolution Pokemon Eevee, a fan favorite with endless potential.',
    stock: 25,
  },
  {
    name: 'Lugia V',
    setName: 'Silver Tempest',
    rarity: 'Ultra Rare',
    condition: 'Mint',
    price: '55.00',
    imageUrl: 'https://images.pokemontcg.io/swsh12/186_hires.png',
    description: 'The guardian of the seas, Lugia, depicted in a powerful V card with majestic artwork.',
    stock: 6,
  },
  {
    name: 'Mew VMAX',
    setName: 'Fusion Strike',
    rarity: 'Secret Rare',
    condition: 'Near Mint',
    price: '125.00',
    imageUrl: 'https://images.pokemontcg.io/swsh8/268_hires.png',
    description: 'The mythical Pokemon Mew in its rainbow rare VMAX form, capable of using any attack.',
    stock: 3,
  },
  {
    name: 'Dragonite V',
    setName: 'Pokemon GO',
    rarity: 'Rare',
    condition: 'Excellent',
    price: '18.75',
    imageUrl: 'https://images.pokemontcg.io/pgo/49_hires.png',
    description: 'The friendly dragon Pokemon Dragonite from the Pokemon GO collaboration set.',
    stock: 12,
  },
  {
    name: 'Sylveon VMAX',
    setName: 'Evolving Skies',
    rarity: 'Ultra Rare',
    condition: 'Mint',
    price: '42.00',
    imageUrl: 'https://images.pokemontcg.io/swsh7/212_hires.png',
    description: 'The fairy-type Eeveelution Sylveon in its adorable VMAX form with ribbon-like feelers.',
    stock: 5,
  },
  {
    name: 'Arceus VSTAR',
    setName: 'Brilliant Stars',
    rarity: 'Ultra Rare',
    condition: 'Near Mint',
    price: '38.50',
    imageUrl: 'https://images.pokemontcg.io/swsh9/123_hires.png',
    description: 'The god of all Pokemon, Arceus, in its powerful VSTAR form with the Starbirth ability.',
    stock: 7,
  },
  {
    name: 'Snorlax',
    setName: 'Vivid Voltage',
    rarity: 'Uncommon',
    condition: 'Good',
    price: '4.25',
    imageUrl: 'https://images.pokemontcg.io/swsh4/131_hires.png',
    description: 'The sleeping giant Snorlax, blocking paths and napping as always.',
    stock: 20,
  },
  {
    name: 'Alakazam V',
    setName: 'Vivid Voltage',
    rarity: 'Rare',
    condition: 'Near Mint',
    price: '12.99',
    imageUrl: 'https://images.pokemontcg.io/swsh4/172_hires.png',
    description: 'The psychic powerhouse Alakazam with an IQ of 5000, bending spoons and minds alike.',
    stock: 9,
  },
  {
    name: 'Gyarados EX',
    setName: 'Breakpoint',
    rarity: 'Rare',
    condition: 'Played',
    price: '8.50',
    imageUrl: 'https://images.pokemontcg.io/xy9/26_hires.png',
    description: 'The fearsome sea serpent Gyarados in its EX form, evolved from the humble Magikarp.',
    stock: 15,
  },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Create table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      set_name VARCHAR(255) NOT NULL,
      rarity VARCHAR(50) NOT NULL,
      condition VARCHAR(50) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_email VARCHAR(255) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      shipping_address TEXT NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      stripe_session_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      card_id INTEGER NOT NULL REFERENCES cards(id),
      quantity INTEGER NOT NULL,
      price_at_purchase DECIMAL(10, 2) NOT NULL
    )
  `;

  // Clear existing cards
  await sql`DELETE FROM order_items`;
  await sql`DELETE FROM orders`;
  await sql`DELETE FROM cards`;

  // Insert sample cards
  for (const card of sampleCards) {
    await db.insert(cards).values(card);
  }

  console.log(`✅ Seeded ${sampleCards.length} cards successfully!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
