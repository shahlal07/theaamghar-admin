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

/**
 * Stricter than isRevenueOrder, and only for profit -- revenue can
 * reasonably count a confirmed/packed/shipped order (money's very likely
 * coming), but profit is meant to reflect a sale that actually went
 * through, not one still in flight that could yet be cancelled or (for
 * COD) never get paid. Only 'delivered' counts. Dashboard/analytics use
 * this for the profit figure specifically while still using
 * isRevenueOrder for the revenue figure.
 */
export function isCompletedOrder(
  o: Pick<{ status: OrderStatus; payment_status: string | null }, 'status' | 'payment_status'>
): boolean {
  if (o.status !== 'delivered') return false;
  if (o.payment_status === 'refunded' || o.payment_status === 'failed') return false;
  return true;
}
