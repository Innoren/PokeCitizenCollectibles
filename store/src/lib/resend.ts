import { Resend } from 'resend';

// The "from" address — must be a verified domain in Resend,
// or use "onboarding@resend.dev" for testing
export const FROM_EMAIL = process.env.FROM_EMAIL || 'PokeCitizen Collectibles <onboarding@resend.dev>';

/**
 * Lazily creates the Resend client only when needed.
 * Returns null if no API key is configured, so the app never crashes
 * at build/startup when email isn't set up yet.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}
