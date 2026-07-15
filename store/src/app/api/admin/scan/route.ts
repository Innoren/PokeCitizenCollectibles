import { NextRequest, NextResponse } from 'next/server';
import { resolveMarketPriceDetailed } from '@/lib/marketPrice';
import { resolveSealedPrice } from '@/lib/sealedPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CARDGRADER_API = 'https://cardgrader.ai/v1';

/**
 * POST /api/admin/scan
 *
 * Identifies a card from front + back photos via CardGrader.AI, then prices it
 * using our own market-pricing system (Pokemon TCG API + TCGCSV).
 *
 * Body (JSON): { frontImageUrl, backImageUrl }  — both required by CardGrader.
 * Returns: { card: { name, setName, number, rarity, variant, condition, marketPrice } }
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.CARDGRADER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'CARDGRADER_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { frontImageUrl, backImageUrl } = body;
    if (!frontImageUrl) {
      return NextResponse.json({ error: 'frontImageUrl is required' }, { status: 400 });
    }

    // Start the scan (identify only — we price with our own system).
    const scanRes = await fetch(`${CARDGRADER_API}/scans`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frontImageUrl,
        // CardGrader requires a back image; fall back to the front if only one
        // was provided (identification relies mainly on the front anyway).
        backImageUrl: backImageUrl || frontImageUrl,
        modules: ['identify'],
      }),
    });

    if (!scanRes.ok) {
      const err = await scanRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail || err.title || `CardGrader error (${scanRes.status})` },
        { status: scanRes.status }
      );
    }

    const scanData = await scanRes.json();
    const scanId = scanData.id;
    if (!scanId) {
      return NextResponse.json({ error: 'Failed to start scan' }, { status: 500 });
    }

    // Poll for completion (CardGrader is queue-backed, ~30-120s).
    const maxWait = 180000;
    const pollInterval = 3000;
    const startedAt = Date.now();
    let result: any = null;

    while (Date.now() - startedAt < maxWait) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const pollRes = await fetch(`${CARDGRADER_API}/scans/${scanId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();
      if (pollData.status === 'completed') { result = pollData; break; }
      if (pollData.status === 'failed') {
        return NextResponse.json({ error: 'Card identification failed' }, { status: 502 });
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'Scan timed out — try again' }, { status: 504 });
    }

    const id = result.identification || {};
    const name: string = id.name || 'Unknown Card';
    const setName: string = id.set || '';
    const number: string = id.number || '';
    const parallel: string = id.parallel && id.parallel.toLowerCase() !== 'base' ? id.parallel : 'Normal';

    // Price it with OUR existing system (same logic the auto-pricer uses).
    const priceRes = await resolveMarketPriceDetailed({
      sku: number || null,
      name,
      setName,
    });
    let marketPrice: number | null = priceRes.price;
    let priceReason = priceRes.reason;

    // If nothing found and it looks like sealed product, try TCGCSV.
    if (marketPrice === null && /elite trainer|booster box|booster bundle|collection box|tin|blister/i.test(name)) {
      marketPrice = await resolveSealedPrice({ name, setName });
      if (marketPrice !== null) priceReason = 'ok';
    }

    return NextResponse.json({
      card: {
        name,
        setName,
        number,
        rarity: '', // CardGrader doesn't return rarity; admin can set it
        variant: parallel,
        condition: 'Near Mint',
        marketPrice: marketPrice !== null ? marketPrice.toFixed(2) : null,
        priceReason,
      },
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
