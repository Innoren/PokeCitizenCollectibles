import { NextRequest, NextResponse } from 'next/server';
import { resolveMarketPrice } from '@/lib/marketPrice';
import { resolveSealedPrice } from '@/lib/sealedPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CARDGRADER_API = 'https://cardgrader.ai/v1';

/**
 * POST /api/admin/scan
 *
 * Accepts a card photo (multipart form with "file" field OR JSON body with "imageUrl").
 * Sends it to CardGrader.AI for identification, then looks up the market price.
 *
 * Returns: { card: { name, set, number, rarity, variant, imageUrl, marketPrice } }
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.CARDGRADER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'CARDGRADER_API_KEY not configured' }, { status: 500 });
  }

  try {
    let scanId: string;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      // Upload to CardGrader
      const cgForm = new FormData();
      cgForm.append('front', file);
      cgForm.append('modules', JSON.stringify(['identify', 'market']));

      const scanRes = await fetch(`${CARDGRADER_API}/scans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: cgForm,
      });

      if (!scanRes.ok) {
        const err = await scanRes.json().catch(() => ({}));
        return NextResponse.json({
          error: err.detail || err.title || `CardGrader error (${scanRes.status})`,
        }, { status: scanRes.status });
      }

      const scanData = await scanRes.json();
      scanId = scanData.id || scanData.scanId;
    } else {
      // JSON body with imageUrl
      const body = await request.json();
      if (!body.imageUrl) {
        return NextResponse.json({ error: 'Provide a file or imageUrl' }, { status: 400 });
      }

      const scanRes = await fetch(`${CARDGRADER_API}/scans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frontUrl: body.imageUrl,
          modules: ['identify', 'market'],
        }),
      });

      if (!scanRes.ok) {
        const err = await scanRes.json().catch(() => ({}));
        return NextResponse.json({
          error: err.detail || err.title || `CardGrader error (${scanRes.status})`,
        }, { status: scanRes.status });
      }

      const scanData = await scanRes.json();
      scanId = scanData.id || scanData.scanId;
    }

    if (!scanId) {
      return NextResponse.json({ error: 'Failed to start scan' }, { status: 500 });
    }

    // Poll for result (CardGrader is async — typically 30-120s)
    const maxWait = 180000; // 3 minutes
    const pollInterval = 3000;
    const started = Date.now();
    let result: any = null;

    while (Date.now() - started < maxWait) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const pollRes = await fetch(`${CARDGRADER_API}/scans/${scanId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();

      if (pollData.status === 'completed') {
        result = pollData;
        break;
      }
      if (pollData.status === 'failed') {
        return NextResponse.json({ error: 'Card identification failed' }, { status: 500 });
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'Scan timed out — try again' }, { status: 504 });
    }

    // Extract identification results
    const identify = result.identify || result.identification || {};
    const market = result.market || {};

    const cardName = identify.name || identify.cardName || 'Unknown Card';
    const setName = identify.set || identify.setName || '';
    const number = identify.number || identify.cardNumber || '';
    const variant = identify.variant || identify.parallel || 'Normal';
    const rarity = identify.rarity || '';

    // Try to get market price from CardGrader response first
    let marketPrice =
      market.rawValue?.mid ??
      market.rawValue?.low ??
      market.value?.raw ??
      null;

    // Fallback: our own market price lookup if CardGrader didn't provide one
    if (marketPrice === null) {
      const sku = number ? `${number}` : null;
      marketPrice = await resolveMarketPrice({ sku, name: cardName, setName });
    }

    return NextResponse.json({
      card: {
        name: cardName,
        setName,
        number,
        rarity,
        variant,
        marketPrice: marketPrice !== null ? parseFloat(String(marketPrice)).toFixed(2) : null,
        condition: 'Near Mint', // Default assumption for scanned cards
      },
      raw: { identify, market },
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
