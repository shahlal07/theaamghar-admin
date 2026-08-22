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
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null;
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

function emptyDashboardData(): DashboardData {
  return {
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    statusCounts: emptyStatusCounts(),
    codPendingCount: 0,
    codPendingAmount: 0,
    codReceivedCount: 0,
    codReceivedAmount: 0,
    averageOrderValue: 0,
    newCustomers: 0,
    returningCustomers: 0,
    dailySeries: [],
    weeklySeries: [],
    monthlySeries: [],
    ordersByCity: [],
    bestSellingVariety: [],
    bestSellingProduct: [],
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const since = subDays(new Date(), 365).toISOString();

  // Prefer the full legacy order shape, but fall back to the shared
  // platform's minimal order shape. This keeps /admin usable while older
  // storefront schemas are still being migrated into the canonical DB.
  let data: unknown[] | null = null;
  const full = await supabase
    .from('orders')
    .select(
      'id, customer_id, total, profit, status, payment_method, payment_status, items, delivery, created_at'
    )
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (!full.error) {
    data = (full.data ?? []) as unknown[];
  } else {
    const minimal = await supabase
      .from('orders')
      .select('id, total, status, payment_method, payment_status, items, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (!minimal.error) {
      data = ((minimal.data ?? []) as Array<Record<string, unknown>>).map((o) => ({
        id: String(o.id),
        customer_id: null,
        total: Number(o.total ?? 0),
        profit: 0,
        status: (o.status as OrderStatus) ?? 'pending',
        payment_method: (o.payment_method as 'cod' | 'online' | null) ?? null,
        payment_status: (o.payment_status as OrderRow['payment_status']) ?? null,
        items: Array.isArray(o.items) ? (o.items as OrderItem[]) : null,
        delivery: null,
        created_at: String(o.created_at),
      }));
    } else {
      // Do not turn a successful authentication into a login-loop just
      // because the dashboard's optional analytics source is unavailable.
      console.error('[dashboard] orders unavailable:', minimal.error.message);
      return emptyDashboardData();
    }
  }

  const orders = (data ?? []) as OrderRow[];
  const revenueOrders = orders.filter(isRevenueOrder);

  const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalProfit = revenueOrders.reduce((s, o) => s + Number(o.profit ?? 0), 0);

  const statusCounts = emptyStatusCounts();
  for (const o of orders) {
    if (statusCounts[o.status] !== undefined) {
      statusCounts[o.status] += 1;
    }
  }

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
    order: OrderRow,
  ) => {
    const point = map.get(key) ?? { label, revenue: 0, profit: 0, orders: 0 };
    if (isRevenueOrder(order)) {
      point.revenue += Number(order.total);
      point.profit += Number(order.profit ?? 0);
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
      o,
    );
    bump(
      monthlyMap,
      format(startOfMonth(created), 'yyyy-MM'),
      format(created, 'MMM yyyy'),
      o,
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
