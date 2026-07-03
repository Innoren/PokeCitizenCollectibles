import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { orders, orderItems, cards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import { orderConfirmationEmail } from '@/lib/emails';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const customerEmail = session.customer_details?.email || '';
      const customerName = session.customer_details?.name || '';
      const shippingAddress = session.shipping_details?.address
        ? `${session.shipping_details.address.line1}, ${session.shipping_details.address.city}, ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}, ${session.shipping_details.address.country}`
        : '';

      const total = ((session.amount_total || 0) / 100).toFixed(2);
      const items = JSON.parse(session.metadata?.items || '[]') as Array<{
        id: number;
        quantity: number;
        price: string;
      }>;

      // Create order
      const [order] = await db
        .insert(orders)
        .values({
          customerEmail,
          customerName,
          shippingAddress,
          total,
          status: 'paid',
          stripeSessionId: session.id,
        })
        .returning();

      // Create order items
      for (const item of items) {
        await db.insert(orderItems).values({
          orderId: order.id,
          cardId: item.id,
          quantity: item.quantity,
          priceAtPurchase: item.price,
        });
      }

      // Send order confirmation email
      try {
        // Look up item names for the email
        const itemsWithNames = await Promise.all(
          items.map(async (item) => {
            const [card] = await db.select().from(cards).where(eq(cards.id, item.id)).limit(1);
            return {
              name: card?.name || `Item #${item.id}`,
              quantity: item.quantity,
              price: item.price,
            };
          })
        );

        const { html, text } = orderConfirmationEmail({
          orderId: order.id,
          customerName,
          customerEmail,
          shippingAddress,
          total,
          items: itemsWithNames,
        });

        const resend = getResend();
        if (resend) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `Order Confirmed — #${order.id} | PokeCitizen Collectibles`,
            html,
            text,
          });
          console.log(`Confirmation email sent to ${customerEmail}`);
        } else {
          console.log('RESEND_API_KEY not set — skipping confirmation email');
        }
      } catch (emailError) {
        // Don't fail the webhook if email fails
        console.error('Failed to send confirmation email:', emailError);
      }

      console.log(`Order ${order.id} created successfully`);
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json(
        { error: 'Error processing order' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
