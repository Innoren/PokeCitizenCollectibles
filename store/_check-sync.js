require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql`SELECT COUNT(*) c FROM cards WHERE last_price_sync > NOW() - INTERVAL '5 minutes'`
  .then((r) => console.log('Cards synced in last 5 min:', r[0].c))
  .catch((e) => console.error(e.message));
