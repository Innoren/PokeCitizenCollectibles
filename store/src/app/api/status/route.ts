import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cards, orders } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // Database health check
    const [cardCount] = await db.select({ count: sql<number>`count(*)` }).from(cards);
    const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);

    // Get recent orders
    const recentOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5);

    // Calculate total revenue
    const [revenue] = await db
      .select({ total: sql<string>`COALESCE(SUM(total::numeric), 0)` })
      .from(orders);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: 'connected',
      stats: {
        totalCards: Number(cardCount.count),
        totalOrders: Number(orderCount.count),
        totalRevenue: parseFloat(revenue.total || '0').toFixed(2),
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        customer: o.customerName,
        total: o.total,
        status: o.status,
        date: o.createdAt,
      })),
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        database: 'disconnected',
        error: error.message,
      },
      { status: 503 }
    );
  }
}
