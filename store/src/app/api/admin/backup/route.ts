import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createInventorySnapshot, snapshotFileName } from '@/lib/backup';

/**
 * Automatic, READ-ONLY inventory backup endpoint.
 *
 * - Reads all store data (cards, orders, order_items, users) — never writes/deletes.
 * - Uploads a timestamped JSON snapshot to Vercel Blob under `backups/`.
 * - Intended to be triggered on a schedule by a Vercel Cron Job (see vercel.json),
 *   but can also be called manually by an authorized admin.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron automatically sends this header when CRON_SECRET is set in the
 * project's environment variables.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, refuse rather than exposing data publicly.
  if (!secret) return false;

  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not set' },
      { status: 500 }
    );
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is not set — cannot store backup' },
      { status: 500 }
    );
  }

  try {
    const snapshot = await createInventorySnapshot(connectionString);
    const fileName = snapshotFileName(snapshot.takenAt);
    const pathname = `backups/${fileName}`;

    const blob = await put(pathname, JSON.stringify(snapshot, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: blobToken,
      addRandomSuffix: false,
    });

    // Surface a warning if the store looks empty, but still succeed.
    const warning =
      snapshot.counts.cards === 0
        ? 'WARNING: 0 cards found in this snapshot.'
        : undefined;

    return NextResponse.json({
      ok: true,
      takenAt: snapshot.takenAt,
      counts: snapshot.counts,
      url: blob.url,
      pathname: blob.pathname,
      ...(warning ? { warning } : {}),
    });
  } catch (error: any) {
    // The database is never modified by this route, so a failure is safe.
    console.error('Backup failed (database not modified):', error);
    return NextResponse.json(
      { error: error?.message || 'Backup failed' },
      { status: 500 }
    );
  }
}
