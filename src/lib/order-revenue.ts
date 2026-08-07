import type { OrderStatus } from '@/lib/order-status';

const NON_REVENUE_STATUSES: OrderStatus[] = ['cancelled', 'refunded'];

/**
 * Revenue/profit must be excluded not just when the fulfillment `status` is
 * cancelled/refunded, but also when `payment_status` says the money was
 * refunded or never collected (failed) — the two fields are independent
 * (e.g. a "delivered" order can still have payment_status = 'refunded').
 */
export function isRevenueOrder(
  o: Pick<{ status: OrderStatus; payment_status: string | null }, 'status' | 'payment_status'>
): boolean {
  if (NON_REVENUE_STATUSES.includes(o.status)) return false;
  if (o.payment_status === 'refunded' || o.payment_status === 'failed') return false;
  return true;
}
