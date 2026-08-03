import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET — return the currently featured card (if any)
export async function GET() {
  try {
    const [featured] = await db
      .select()
      .from(cards)
      .where(eq(cards.featured, true))
      .limit(1);

    return NextResponse.json({ featured: featured || null });
  } catch (error: any) {
    console.error('Error fetching featured card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch featured card' },
      { status: 500 }
    );
  }
}

// POST — set a card as featured (unsets any previous)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId } = body;

    if (!cardId) {
      return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
    }

    // Unset all currently featured cards
    await db.update(cards).set({ featured: false }).where(eq(cards.featured, true));

    // Set the new featured card
    const [updated] = await db
      .update(cards)
      .set({ featured: true })
      .where(eq(cards.id, parseInt(cardId, 10)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ featured: updated });
  } catch (error: any) {
    console.error('Error setting featured card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set featured card' },
      { status: 500 }
    );
  }
}

// DELETE — unset featured (no card featured)
export async function DELETE() {
  try {
    await db.update(cards).set({ featured: false }).where(eq(cards.featured, true));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing featured card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove featured card' },
      { status: 500 }
    );
  }
}
