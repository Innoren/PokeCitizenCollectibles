import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, cards } from '@/db/schema';
import { sql, gte, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '1d';

  // Calculate the start date based on period
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '1d':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '1w':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1m':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3m':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  try {
    // Total orders in period
    const [orderStats] = await db
      .select({
        count: sql<number>`count(*)`,
        revenue: sql<string>`COALESCE(SUM(total::numeric), 0)`,
        avgOrder: sql<string>`COALESCE(AVG(total::numeric), 0)`,
      })
      .from(orders)
      .where(gte(orders.createdAt, startDate));

    // Orders over time (for chart)
    let groupBy: string;
    let dateFormat: string;

    switch (period) {
      case '1h':
        groupBy = "date_trunc('minute', created_at)";
        dateFormat = 'HH24:MI';
        break;
      case '1d':
        groupBy = "date_trunc('hour', created_at)";
        dateFormat = 'HH24:00';
        break;
      case '1w':
        groupBy = "date_trunc('day', created_at)";
        dateFormat = 'Mon DD';
        break;
      case '1m':
        groupBy = "date_trunc('day', created_at)";
        dateFormat = 'Mon DD';
        break;
      case '3m':
        groupBy = "date_trunc('week', created_at)";
        dateFormat = 'Mon DD';
        break;
      case '1y':
        groupBy = "date_trunc('month', created_at)";
        dateFormat = 'Mon YYYY';
        break;
      default:
        groupBy = "date_trunc('hour', created_at)";
        dateFormat = 'HH24:00';
    }

    const timeline = await db.execute(sql.raw(`
      SELECT 
        to_char(${groupBy}, '${dateFormat}') as label,
        ${groupBy} as bucket,
        COUNT(*) as orders,
        COALESCE(SUM(total::numeric), 0) as revenue
      FROM orders
      WHERE created_at >= '${startDate.toISOString()}'
      GROUP BY ${groupBy}
      ORDER BY ${groupBy} ASC
    `));

    // Top selling items in period
    const topItems = await db.execute(sql.raw(`
      SELECT 
        c.name,
        c.set_name,
        SUM(oi.quantity) as units_sold,
        SUM(oi.price_at_purchase::numeric * oi.quantity) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN cards c ON c.id = oi.card_id
      WHERE o.created_at >= '${startDate.toISOString()}'
      GROUP BY c.id, c.name, c.set_name
      ORDER BY units_sold DESC
      LIMIT 10
    `));

    // Recent orders
    const recentOrders = await db
      .select()
      .from(orders)
      .where(gte(orders.createdAt, startDate))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      summary: {
        totalOrders: Number(orderStats.count),
        totalRevenue: parseFloat(orderStats.revenue || '0').toFixed(2),
        averageOrder: parseFloat(orderStats.avgOrder || '0').toFixed(2),
      },
      timeline: timeline.rows || [],
      topItems: topItems.rows || [],
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        customer: o.customerName,
        email: o.customerEmail,
        total: o.total,
        status: o.status,
        date: o.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
