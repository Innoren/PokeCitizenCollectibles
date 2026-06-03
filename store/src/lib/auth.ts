import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'pm_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SECRET = process.env.ADMIN_SESSION_SECRET || 'default-secret-change-me';

/**
 * Hash a password using Web Crypto (works in all Next.js environments)
 */
export async function hashPassword(password: string): Promise<string> {
  const crypto = await import('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const crypto = await import('crypto');
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Create a simple signed session token
 */
function createToken(userId: number): string {
  const crypto = require('crypto');
  const payload = `${userId}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}:${signature}`;
}

/**
 * Verify and decode a session token
 */
function verifyToken(token: string): number | null {
  try {
    const crypto = require('crypto');
    const parts = token.split(':');
    if (parts.length !== 3) return null;

    const [userId, timestamp, signature] = parts;
    const payload = `${userId}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

    if (signature !== expectedSig) return null;

    // Check if expired (30 days)
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > MAX_AGE * 1000) return null;

    return parseInt(userId, 10);
  } catch {
    return null;
  }
}

/**
 * Set session cookie on a response
 */
export function createSessionCookie(response: NextResponse, user: { id: number }): NextResponse {
  const token = createToken(user.id);
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  });
  return response;
}

/**
 * Get the current logged-in user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getSessionUser() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    const userId = verifyToken(sessionCookie.value);
    if (!userId) return null;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user || null;
  } catch {
    return null;
  }
}
