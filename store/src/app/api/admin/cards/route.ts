import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { classifyProduct } from '@/lib/classify';

// POST — Add a new card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, setName, rarity, condition, price, imageUrl, description, stock, sku, productType } = body;

    // Basic validation
    if (!name || !setName || !rarity || !condition || !price || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, setName, rarity, condition, price, imageUrl' },
        { status: 400 }
      );
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Auto-classify: Single Card vs Sealed Product
    const category = classifyProduct({ name, productType, rarity, condition });

    const [newCard] = await db
      .insert(cards)
      .values({
        sku: sku || null,
        name,
        setName,
        category,
        rarity,
        condition,
        price: String(price),
        imageUrl,
        description: description || null,
        stock: stock || 1,
      })
      .returning();

    return NextResponse.json({ card: newCard }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add card' },
      { status: 500 }
    );
  }
}

// DELETE — Remove a card by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    await db.delete(cards).where(eq(cards.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete card' },
      { status: 500 }
    );
  }
}

// PATCH — Update a card's price (or other fields)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, price, stock, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (price !== undefined) updates.price = String(price);
    if (stock !== undefined) updates.stock = stock;
    if (name !== undefined) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(cards).set(updates).where(eq(cards.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating card:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update card' },
      { status: 500 }
    );
  }
}
