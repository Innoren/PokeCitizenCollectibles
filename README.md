# PokeCitizen Collectibles — Pokemon Card Store

A modern Pokemon card e-commerce store built with Next.js 14, Neon PostgreSQL, Drizzle ORM, and Stripe.

## Setup

```bash
cd store
npm install
cp .env.example .env.local   # Fill in your Neon + Stripe credentials
npm run db:push              # Create tables
npm run db:seed              # Add sample cards
npm run dev                  # Start at http://localhost:3000
```

## Deploy on Vercel

1. Push to GitHub
2. Import in Vercel, set root directory to `store`
3. Add environment variables from `.env.example`
4. Deploy
