/**
 * SAFE, READ-ONLY local backup of all store data to a timestamped JSON file.
 * This script NEVER writes to or deletes from the database. It only reads.
 *
 * Run manually:   npm run db:backup
 * Recommended:    run before any schema change or migration, and on a schedule.
 *
 * For automatic scheduled backups in production, see:
 *   - src/app/api/admin/backup/route.ts  (cron endpoint -> Vercel Blob)
 *   - vercel.json                        (daily cron schedule)
 *
 * Output: ./backups/backup-<ISO timestamp>.json
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createInventorySnapshot, snapshotFileName } from '../lib/backup';

config({ path: resolve(__dirname, '../../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set. Aborting backup.');
  process.exit(1);
}

async function main() {
  console.log('📦 Starting read-only backup...');

  const snapshot = await createInventorySnapshot(connectionString!);

  const dir = resolve(__dirname, '../../backups');
  mkdirSync(dir, { recursive: true });

  const file = resolve(dir, snapshotFileName(snapshot.takenAt));
  writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log(`✅ Backup complete: ${file}`);
  console.log(
    `   cards=${snapshot.counts.cards} orders=${snapshot.counts.orders} users=${snapshot.counts.users}`
  );

  if (snapshot.counts.cards === 0) {
    console.warn(
      '⚠️  WARNING: 0 cards found. If you expected products, do NOT overwrite older backups.'
    );
  }
}

main().catch((err) => {
  console.error('❌ Backup failed (database was not modified):', err);
  process.exit(1);
});
