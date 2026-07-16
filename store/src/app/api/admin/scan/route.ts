import { NextRequest, NextResponse } from 'next/server';
import { resolveMarketPriceDetailed } from '@/lib/marketPrice';
import { resolveCardPriceViaTcgcsv } from '@/lib/sealedPrice';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * POST /api/admin/scan
 *
 * Accepts a card front image (base64 or public URL), sends it to Gemini 3.5 Flash
 * to read the card name, collector number, set, and rarity in one shot.
 * Then prices it using the existing market pricing system.
 *
 * Body: { imageBase64: string (base64 JPEG/PNG data) } or { imageUrl: string }
 * Returns: { name, number, setName, rarity, variant, marketPrice, condition }
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { imageBase64, imageUrl } = body;

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ error: 'Provide imageBase64 or imageUrl' }, { status: 400 });
    }

    // Build the Gemini request with the image.
    const imagePart: any = imageBase64
      ? { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
      : { fileData: { mimeType: 'image/jpeg', fileUri: imageUrl } };

    const prompt = `Read this Pokemon card. Return JSON: {"name":"card name","number":"collector number before slash","set":"set name","rarity":"rarity"}`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            imagePart,
          ],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      const errMsg = err.error?.message || `Gemini returned ${geminiRes.status}`;
      console.error('Gemini error:', errMsg);
      return NextResponse.json({
        error: errMsg,
        card: { name: '', number: '', setName: '', rarity: '', marketPrice: null, condition: 'Near Mint' },
      });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON from Gemini's response.
    let parsed: { name: string; number: string; set: string; rarity: string };
    try {
      // With responseMimeType=application/json, output should be clean JSON.
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
      // Normalize "N/A" to empty string.
      if (parsed.number === 'N/A' || parsed.number === 'n/a') parsed.number = '';
      if (parsed.set === 'N/A' || parsed.set === 'n/a') parsed.set = '';
      if (parsed.rarity === 'N/A' || parsed.rarity === 'n/a') parsed.rarity = '';
    } catch {
      return NextResponse.json({
        error: 'Failed to parse Gemini response',
        raw: text,
        card: { name: '', number: '', setName: '', rarity: '', marketPrice: null, condition: 'Near Mint' },
      });
    }

    // Price it using our existing system.
    const priceResult = await resolveMarketPriceDetailed({
      sku: parsed.number || null,
      name: parsed.name,
      setName: parsed.set || undefined,
    });

    let marketPrice = priceResult.price;

    // TCGCSV fallback for new sets.
    if (marketPrice === null && parsed.set) {
      marketPrice = await resolveCardPriceViaTcgcsv({ name: parsed.name, setName: parsed.set });
    }

    return NextResponse.json({
      card: {
        name: parsed.name || '',
        number: parsed.number || '',
        setName: parsed.set || '',
        rarity: parsed.rarity || 'Rare',
        variant: 'Normal',
        condition: 'Near Mint',
        marketPrice: marketPrice !== null ? marketPrice.toFixed(2) : null,
      },
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
