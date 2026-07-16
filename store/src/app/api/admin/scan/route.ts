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

    const prompt = `You are a Pokémon trading card identifier. Look at this card image and extract:
1. The card name (the name at the top of the card, e.g. "Charizard ex", "Pikachu VMAX")
2. The collector number (bottom left or bottom right, format like "25/198" or "159/086" — just give me the first number before the slash)
3. The set name (from the set symbol or text on the card if visible)
4. The rarity (Common, Uncommon, Rare, Ultra Rare, Secret Rare, or Illustration Rare)

Respond ONLY in this exact JSON format, nothing else:
{"name":"card name","number":"collector number","set":"set name or empty string","rarity":"rarity"}

If you cannot read a field, use an empty string. Do not explain or add any text outside the JSON.`;

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
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      return NextResponse.json({
        error: err.error?.message || `Gemini error (${geminiRes.status})`,
      }, { status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON from Gemini's response.
    let parsed: { name: string; number: string; set: string; rarity: string };
    try {
      // Gemini sometimes wraps in ```json ... ```
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
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
