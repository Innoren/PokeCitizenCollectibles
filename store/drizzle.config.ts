import 'dotenv/config';
import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Load .env.local
config({ path: '.env.local' });

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
