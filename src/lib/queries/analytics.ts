import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/order-status';
import { isRevenueOrder } from '@/lib/order-revenue';

type OrderItem = { name?: string; variety?: string; qty?: number };
type OrderRow = {
  total: number;
  profit: number;
  status: OrderStatus;
  payment_method: 'cod' | 'online' | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  items: OrderItem[] | null;
  delivery: { city?: string } | null;
  created_at: string;
};

export type DayOfWeekPoint = { day: string; revenue: number; orders: number };
export type NamedCount = { name: string; count: number };

export type AnalyticsData = {
  from: string;
  to: string;
  revenue: number;
  profit: number;
  orderCount: number;
  averageOrderValue: number;
  revenueChangePercent: number | null;
  profitChangePercent: number | null;
  orderCountChangePercent: number | null;
  aovChangePercent: number | null;
  dailySeries: { label: string; revenue: number; profit: number; orders: number }[];
  dayOfWeek: DayOfWeekPoint[];
  topProducts: NamedCount[];
  topVarieties: NamedCount[];
  topCities: NamedCount[];
  paymentMethodSplit: { method: string; count: number; revenue: number }[];
  statusCounts: Record<OrderStatus, number>;
};

function summarize(orders: OrderRow[]) {
  const revenueOrders = orders.filter(isRevenueOrder);
  const revenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);
  const profit = revenueOrders.reduce((s, o) => s + Number(o.profit), 0);
  return {
    revenue,
    profit,
    orderCount: orders.length,
    aov: revenueOrders.length ? revenue / revenueOrders.length : 0,
  };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

async function fetchOrders(supabase: Awaited<ReturnType<typeof createClient>>, from: Date, to: Date) {
  const { data, error } = await supabase
    .from('orders')
    .select('total, profit, status, payment_method, payment_status, items, delivery, created_at')
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return (data ?? []) as OrderRow[];
}

export async function getAnalyticsData(fromDate: Date, toDateExclusive: Date): Promise<AnalyticsData> {
  const supabase = await createClient();

  const rangeDays = Math.max(differenceInCalendarDays(toDateExclusive, fromDate), 1);
  const prevFrom = subDays(fromDate, rangeDays);
  const prevTo = fromDate;

  const [orders, prevOrders] = await Promise.all([
    fetchOrders(supabase, fromDate, toDateExclusive),
    fetchOrders(supabase, prevFrom, prevTo),
  ]);

  const current = summarize(orders);
  const previous = summarize(prevOrders);

  const dailyMap = new Map<string, { label: string; revenue: number; profit: number; orders: number }>();
  const dowMap = new Map<string, DayOfWeekPoint>();
  const productMap = new Map<string, number>();
  const varietyMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const paymentMap = new Map<string, { count: number; revenue: number }>();
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;

  const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (const o of orders) {
    const created = new Date(o.created_at);
    const dayKey = format(created, 'yyyy-MM-dd');
    const dayPoint = dailyMap.get(dayKey) ?? {
      label: format(created, 'MMM d'),
      revenue: 0,
      profit: 0,
      orders: 0,
    };
    const isRevenue = isRevenueOrder(o);
    if (isRevenue) {
      dayPoint.revenue += Number(o.total);
      dayPoint.profit += Number(o.profit);
    }
    dayPoint.orders += 1;
    dailyMap.set(dayKey, dayPoint);

    const dowLabel = DOW_LABELS[created.getDay()];
    const dowPoint = dowMap.get(dowLabel) ?? { day: dowLabel, revenue: 0, orders: 0 };
    if (isRevenue) dowPoint.revenue += Number(o.total);
    dowPoint.orders += 1;
    dowMap.set(dowLabel, dowPoint);

    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

    const method = o.payment_method ?? 'unknown';
    const pEntry = paymentMap.get(method) ?? { count: 0, revenue: 0 };
    pEntry.count += 1;
    if (isRevenue) pEntry.revenue += Number(o.total);
    paymentMap.set(method, pEntry);

    const city = o.delivery?.city?.trim();
    if (city) cityMap.set(city, (cityMap.get(city) ?? 0) + 1);

    for (const item of o.items ?? []) {
      const qty = item.qty ?? 0;
      if (item.name) productMap.set(item.name, (productMap.get(item.name) ?? 0) + qty);
      if (item.variety) varietyMap.set(item.variety, (varietyMap.get(item.variety) ?? 0) + qty);
    }
  }

  const toTop = (map: Map<string, number>, limit: number): NamedCount[] =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  return {
    from: fromDate.toISOString(),
    to: toDateExclusive.toISOString(),
    revenue: current.revenue,
    profit: current.profit,
    orderCount: current.orderCount,
    averageOrderValue: current.aov,
    revenueChangePercent: pctChange(current.revenue, previous.revenue),
    profitChangePercent: pctChange(current.profit, previous.profit),
    orderCountChangePercent: pctChange(current.orderCount, previous.orderCount),
    aovChangePercent: pctChange(current.aov, previous.aov),
    dailySeries: [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
    dayOfWeek: DOW_LABELS.map((d) => dowMap.get(d) ?? { day: d, revenue: 0, orders: 0 }),
    topProducts: toTop(productMap, 8),
    topVarieties: toTop(varietyMap, 8),
    topCities: toTop(cityMap, 8),
    paymentMethodSplit: [...paymentMap.entries()].map(([method, v]) => ({
      method,
      count: v.count,
      revenue: v.revenue,
    })),
    statusCounts,
  };
}
