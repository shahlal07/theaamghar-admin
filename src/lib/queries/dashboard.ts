import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isRevenueOrder } from '@/lib/order-revenue';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  format,
  subDays,
} from 'date-fns';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

type OrderItem = {
  product_id?: string;
  name?: string;
  variety?: string;
  box_size_kg?: number;
  qty?: number;
  unit_price?: number;
};

type OrderRow = {
  id: string;
  customer_id: string | null;
  total: number;
  profit: number;
  status: OrderStatus;
  payment_method: 'cod' | 'online' | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  items: OrderItem[] | null;
  delivery: { city?: string } | null;
  created_at: string;
};

export type SeriesPoint = { label: string; revenue: number; profit: number; orders: number };

export type DashboardData = {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  statusCounts: Record<OrderStatus, number>;
  codPendingCount: number;
  codPendingAmount: number;
  codReceivedCount: number;
  codReceivedAmount: number;
  averageOrderValue: number;
  newCustomers: number;
  returningCustomers: number;
  dailySeries: SeriesPoint[];
  weeklySeries: SeriesPoint[];
  monthlySeries: SeriesPoint[];
  ordersByCity: { city: string; orders: number }[];
  bestSellingVariety: { variety: string; qty: number }[];
  bestSellingProduct: { name: string; qty: number }[];
};

function emptyStatusCounts(): Record<OrderStatus, number> {
  return Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
}

/**
 * Fetches the last 365 days of orders and computes every dashboard stat
 * in application code rather than bespoke SQL aggregates. At the order
 * volumes a single-vendor mango business sees, this is simpler and far
 * easier to verify than hand-written jsonb/date_trunc SQL — revisit with
 * materialized views only if this ever becomes a measured bottleneck
 * (see Phase 15 — performance pass).
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const since = subDays(new Date(), 365).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, customer_id, total, profit, status, payment_method, payment_status, items, delivery, created_at'
    )
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load orders for dashboard: ${error.message}`);
  }

  const orders = (data ?? []) as OrderRow[];
  const revenueOrders = orders.filter(isRevenueOrder);

  const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalProfit = revenueOrders.reduce((s, o) => s + Number(o.profit), 0);

  const statusCounts = emptyStatusCounts();
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  const codPending = orders.filter(
    (o) => o.payment_method === 'cod' && o.payment_status === 'pending'
  );
  const codReceived = orders.filter(
    (o) => o.payment_method === 'cod' && o.payment_status === 'paid'
  );

  const customerOrderCounts = new Map<string, number>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    customerOrderCounts.set(
      o.customer_id,
      (customerOrderCounts.get(o.customer_id) ?? 0) + 1
    );
  }
  let newCustomers = 0;
  let returningCustomers = 0;
  for (const count of customerOrderCounts.values()) {
    if (count > 1) returningCustomers++;
    else newCustomers++;
  }

  const dailyMap = new Map<string, SeriesPoint>();
  const weeklyMap = new Map<string, SeriesPoint>();
  const monthlyMap = new Map<string, SeriesPoint>();
  const cityMap = new Map<string, number>();
  const varietyMap = new Map<string, number>();
  const productMap = new Map<string, number>();

  const bump = (
    map: Map<string, SeriesPoint>,
    key: string,
    label: string,
    order: OrderRow
  ) => {
    const point = map.get(key) ?? { label, revenue: 0, profit: 0, orders: 0 };
    if (isRevenueOrder(order)) {
      point.revenue += Number(order.total);
      point.profit += Number(order.profit);
    }
    point.orders += 1;
    map.set(key, point);
  };

  for (const o of orders) {
    const created = new Date(o.created_at);
    bump(dailyMap, format(startOfDay(created), 'yyyy-MM-dd'), format(created, 'MMM d'), o);
    bump(
      weeklyMap,
      format(startOfWeek(created), 'yyyy-MM-dd'),
      `Wk of ${format(startOfWeek(created), 'MMM d')}`,
      o
    );
    bump(
      monthlyMap,
      format(startOfMonth(created), 'yyyy-MM'),
      format(created, 'MMM yyyy'),
      o
    );

    const city = o.delivery?.city?.trim();
    if (city) cityMap.set(city, (cityMap.get(city) ?? 0) + 1);

    for (const item of o.items ?? []) {
      const qty = item.qty ?? 0;
      if (item.variety) varietyMap.set(item.variety, (varietyMap.get(item.variety) ?? 0) + qty);
      if (item.name) productMap.set(item.name, (productMap.get(item.name) ?? 0) + qty);
    }
  }

  const toSorted = (map: Map<string, SeriesPoint>) =>
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

  return {
    totalRevenue,
    totalProfit,
    totalOrders: orders.length,
    statusCounts,
    codPendingCount: codPending.length,
    codPendingAmount: codPending.reduce((s, o) => s + Number(o.total), 0),
    codReceivedCount: codReceived.length,
    codReceivedAmount: codReceived.reduce((s, o) => s + Number(o.total), 0),
    averageOrderValue: revenueOrders.length ? totalRevenue / revenueOrders.length : 0,
    newCustomers,
    returningCustomers,
    dailySeries: toSorted(dailyMap).slice(-30),
    weeklySeries: toSorted(weeklyMap).slice(-12),
    monthlySeries: toSorted(monthlyMap).slice(-12),
    ordersByCity: [...cityMap.entries()]
      .map(([city, count]) => ({ city, orders: count }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 8),
    bestSellingVariety: [...varietyMap.entries()]
      .map(([variety, qty]) => ({ variety, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6),
    bestSellingProduct: [...productMap.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6),
  };
}
