import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

// The "from" address — must be a verified domain in Resend,
// or use "onboarding@resend.dev" for testing
export const FROM_EMAIL = process.env.FROM_EMAIL || 'PokeCitizen Collectibles <onboarding@resend.dev>';
