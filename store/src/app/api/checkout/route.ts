import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

interface CheckoutItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
  imageUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const { items } = (await request.json()) as { items: CheckoutItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: [item.imageUrl],
          },
          unit_amount: Math.round(parseFloat(item.price) * 100),
        },
        quantity: item.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      success_url: `${baseUrl}/checkout?success=true`,
      cancel_url: `${baseUrl}/cart`,
      metadata: {
        items: JSON.stringify(
          items.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price }))
        ),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
