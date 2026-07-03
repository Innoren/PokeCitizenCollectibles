/**
 * Shared, READ-ONLY inventory snapshot logic.
 * This module NEVER writes to or deletes from the database. It only reads.
 *
 * Used by:
 *  - src/db/backup.ts            (local manual backup to ./backups)
 *  - src/app/api/admin/backup    (scheduled cron backup to Vercel Blob)
 */

import { neon } from '@neondatabase/serverless';

export interface InventorySnapshot {
  takenAt: string;
  counts: {
    cards: number;
    orders: number;
    orderItems: number;
    users: number;
  };
  data: {
    cards: Record<string, unknown>[];
    orders: Record<string, unknown>[];
    orderItems: Record<string, unknown>[];
    users: Record<string, unknown>[];
  };
}

/**
 * Reads all store tables and returns a complete snapshot object.
 * READ ONLY — contains no INSERT/UPDATE/DELETE/DROP.
 */
export async function createInventorySnapshot(
  connectionString: string
): Promise<InventorySnapshot> {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot create snapshot.');
  }

  const sql = neon(connectionString);

  // READ ONLY queries only.
  const cards = await sql`SELECT * FROM cards ORDER BY id`;
  const orders = await sql`SELECT * FROM orders ORDER BY id`;
  const orderItems = await sql`SELECT * FROM order_items ORDER BY id`;
  const users = await sql`SELECT id, email, name, is_admin, created_at FROM users ORDER BY id`;

  return {
    takenAt: new Date().toISOString(),
    counts: {
      cards: cards.length,
      orders: orders.length,
      orderItems: orderItems.length,
      users: users.length,
    },
    data: { cards, orders, orderItems, users },
  };
}

/**
 * Builds a filesystem/Blob-safe filename for a snapshot taken at `takenAt`.
 */
export function snapshotFileName(takenAt: string): string {
  const stamp = takenAt.replace(/[:.]/g, '-');
  return `backup-${stamp}.json`;
}
