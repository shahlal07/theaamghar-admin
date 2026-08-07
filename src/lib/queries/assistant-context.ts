import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { subDays } from 'date-fns';

/**
 * Builds a compact, text-only snapshot of the business's current state to
 * feed the AI assistant as context. Deliberately excludes customer PII
 * (names, phone numbers, emails, addresses) — only order numbers, statuses,
 * totals, cities, and product-level data go to the third-party LLM API.
 */
export async function getAssistantContext(): Promise<string> {
  const supabase = await createClient();
  const since = subDays(new Date(), 30).toISOString();

  const [{ data: orders }, { data: boxSizes }] = await Promise.all([
    supabase
      .from('orders')
      .select('order_number, status, payment_status, payment_method, total, profit, delivery, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('product_box_sizes')
      .select('box_size_kg, stock_qty, low_stock_threshold, active, products(name)'),
  ]);

  const rows = orders ?? [];
  const statusCounts: Record<string, number> = {};
  let revenue = 0;
  let profit = 0;
  let codPendingCount = 0;
  let codPendingAmount = 0;

  for (const o of rows) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    if (o.status !== 'cancelled' && o.status !== 'refunded' && o.payment_status !== 'refunded') {
      revenue += Number(o.total);
      profit += Number(o.profit);
    }
    if (o.payment_method === 'cod' && o.payment_status === 'pending') {
      codPendingCount += 1;
      codPendingAmount += Number(o.total);
    }
  }

  type BoxRow = {
    box_size_kg: number;
    stock_qty: number;
    low_stock_threshold: number;
    active: boolean;
    products: { name: string } | { name: string }[] | null;
  };
  const oneOrNull = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const lowStock = ((boxSizes ?? []) as BoxRow[])
    .filter((b) => b.active && b.stock_qty <= b.low_stock_threshold)
    .map((b) => `${oneOrNull(b.products)?.name ?? 'Unknown'} ${b.box_size_kg}kg: ${b.stock_qty} left`);

  const recentOrders = rows
    .slice(0, 20)
    .map((o) => {
      const city = (o.delivery as { city?: string } | null)?.city ?? 'unknown city';
      return `${o.order_number} | ${o.status} | payment:${o.payment_status} (${o.payment_method}) | Rs ${o.total} | ${city} | ${new Date(o.created_at).toLocaleDateString('en-PK')}`;
    })
    .join('\n');

  return `
BUSINESS SNAPSHOT (last 30 days, ${rows.length} orders):
- Revenue: Rs ${revenue.toLocaleString('en-PK')}
- Profit: Rs ${profit.toLocaleString('en-PK')}
- Orders by status: ${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}
- COD pending collection: ${codPendingCount} orders, Rs ${codPendingAmount.toLocaleString('en-PK')}

LOW / OUT OF STOCK BOX SIZES:
${lowStock.length > 0 ? lowStock.join('\n') : 'None currently low on stock.'}

RECENT ORDERS (most recent 20, order number | status | payment | total | city | date):
${recentOrders || 'No orders in the last 30 days.'}
`.trim();
}
