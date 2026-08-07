import { describe, it, expect } from 'vitest';
import { isRevenueOrder } from './order-revenue';

describe('isRevenueOrder', () => {
  it('counts a normal delivered order as revenue', () => {
    expect(isRevenueOrder({ status: 'delivered', payment_status: 'paid' })).toBe(true);
  });

  it('excludes cancelled orders regardless of payment_status', () => {
    expect(isRevenueOrder({ status: 'cancelled', payment_status: 'paid' })).toBe(false);
  });

  it('excludes refunded-status orders', () => {
    expect(isRevenueOrder({ status: 'refunded', payment_status: 'paid' })).toBe(false);
  });

  it('excludes a delivered order whose payment was refunded (status/payment_status independence)', () => {
    expect(isRevenueOrder({ status: 'delivered', payment_status: 'refunded' })).toBe(false);
  });

  it('excludes a delivered order whose payment failed', () => {
    expect(isRevenueOrder({ status: 'delivered', payment_status: 'failed' })).toBe(false);
  });

  it('still counts a pending order with pending payment as revenue', () => {
    expect(isRevenueOrder({ status: 'pending', payment_status: 'pending' })).toBe(true);
  });

  it('counts a null payment_status (COD not yet collected) as revenue', () => {
    expect(isRevenueOrder({ status: 'confirmed', payment_status: null })).toBe(true);
  });
});
