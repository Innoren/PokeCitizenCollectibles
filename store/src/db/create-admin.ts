/**
 * Creates an admin user account.
 * Run with: npx tsx --env-file=.env.local src/db/create-admin.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
import { resolve } from 'path';
import crypto from 'crypto';

config({ path: resolve(__dirname, '../../.env.local') });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// ── Config — change these ────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pokecitizencollectibles.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pokemarket2024';
// ─────────────────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Creating admin user...');
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Name:  ${ADMIN_NAME}`);

  // Check if already exists
  const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);

  if (existing.length > 0) {
    // Update to ensure admin flag is set
    await db
      .update(users)
      .set({ isAdmin: true, passwordHash: hashPassword(ADMIN_PASSWORD) })
      .where(eq(users.email, ADMIN_EMAIL));
    console.log('✓ Admin user already existed — updated password and ensured admin flag.');
  } else {
    await db.insert(users).values({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      isAdmin: true,
    });
    console.log('✓ Admin user created successfully!');
  }

  console.log('\nYou can now log in at /login with:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('\n⚠️  Change the password in .env.local before deploying!');
}

main().catch(console.error);
