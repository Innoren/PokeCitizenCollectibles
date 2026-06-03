# PokeCitizen Collectibles — Pokemon Card E-Commerce Store

A modern, beautiful Pokemon card e-commerce store built with Next.js 14, Neon PostgreSQL, Drizzle ORM, and Stripe.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635bff)

## Features

- 🎨 Beautiful dark theme with Pokemon-inspired gradients
- 🔍 Search and filter cards by name, rarity, and condition
- 🛒 Shopping cart with localStorage persistence (Zustand)
- 💳 Stripe Checkout integration
- 📱 Fully responsive (mobile-first)
- ⚡ Server-side rendering with Next.js App Router
- 🗄️ Neon PostgreSQL with Drizzle ORM

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon PostgreSQL (`@neondatabase/serverless`)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS
- **State Management**: Zustand (with persist middleware)
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) database
- A [Stripe](https://stripe.com) account

### 1. Install Dependencies

```bash
cd store
npm install
```

### 2. Set Up Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` — Your Neon PostgreSQL connection string
- `STRIPE_SECRET_KEY` — Stripe secret key (starts with `sk_`)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (starts with `pk_`)
- `NEXT_PUBLIC_BASE_URL` — Your app URL (e.g., `http://localhost:3000`)

### 3. Set Up the Database

Push the schema to your Neon database:

```bash
npm run db:push
```

### 4. Seed Sample Data

```bash
npm run db:seed
```

This will populate the database with 16 sample Pokemon cards.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the store.

## Stripe Webhook (Local Development)

For local webhook testing, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

## Deployment on Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set the root directory to `store`
4. Add all environment variables from `.env.example`
5. Deploy!

## Project Structure

```
store/
├── src/
│   ├── app/           # Next.js App Router pages & API routes
│   ├── components/    # Reusable UI components
│   ├── db/            # Database schema, connection, and seed
│   ├── lib/           # Utility functions and Stripe config
│   └── store/         # Zustand cart state
├── public/            # Static assets
└── ...config files
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero, featured cards, categories |
| `/shop` | Filterable/searchable card grid with pagination |
| `/shop/[id]` | Card detail page with add to cart |
| `/cart` | Shopping cart with quantity controls |
| `/checkout` | Stripe checkout integration |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cards` | GET | Fetch cards with search/filter/sort/pagination |
| `/api/checkout` | POST | Create Stripe checkout session |
| `/api/webhook` | POST | Handle Stripe webhook events |
