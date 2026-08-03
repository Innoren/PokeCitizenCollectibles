require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql`ALTER TABLE cards ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false`
  .then(() => console.log('Done — featured column added'))
  .catch(console.error);
