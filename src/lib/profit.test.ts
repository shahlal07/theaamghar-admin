import { describe, it, expect } from 'vitest';
import { calculateProfit, type ProfitInputs } from './profit';

const baseInputs: ProfitInputs = {
  productCost: 200 * 5, // purchasePricePerKg * boxSizeKg, computed at the (fruit) call site now
  sellingPrice: 2000,
  packagingBoxCost: 50,
  foamPaperCost: 20,
  brandingStickerCost: 10,
  labourCost: 30,
  shippingCost: 250,
  marketingCostPerOrder: 40,
  miscCost: 10,
  paymentGatewayFeePercent: 2.9,
};

describe('calculateProfit', () => {
  it('passes productCost through unchanged -- callers compute it (purchasePricePerKg * boxSizeKg for fruit, unitCost * qty for other types)', () => {
    const result = calculateProfit(baseInputs);
    expect(result.productCost).toBe(baseInputs.productCost);
  });

  it('sums every cost line into totalCost', () => {
    const result = calculateProfit(baseInputs);
    expect(result.totalCost).toBe(1000 + 50 + 20 + 10 + 30 + 250 + 40 + 10);
  });

  it('deducts the payment gateway fee from selling price for netRevenue', () => {
    const result = calculateProfit(baseInputs);
    const expectedFee = 2000 * (2.9 / 100);
    expect(result.paymentGatewayFee).toBeCloseTo(expectedFee);
    expect(result.netRevenue).toBeCloseTo(2000 - expectedFee);
  });

  it('profit is net revenue minus total cost', () => {
    const result = calculateProfit(baseInputs);
    expect(result.profit).toBeCloseTo(result.netRevenue - result.totalCost);
  });

  it('returns zero margins instead of dividing by zero when selling price is 0', () => {
    const result = calculateProfit({ ...baseInputs, sellingPrice: 0 });
    expect(result.profitMarginPercent).toBe(0);
    expect(result.grossMarginPercent).toBe(0);
  });

  it('a loss-making order reports negative profit and margin', () => {
    const result = calculateProfit({ ...baseInputs, sellingPrice: 500 });
    expect(result.profit).toBeLessThan(0);
    expect(result.profitMarginPercent).toBeLessThan(0);
  });

  it('grossMarginPercent ignores non-product costs (shipping, packaging, etc.)', () => {
    const result = calculateProfit(baseInputs);
    const expected = ((2000 - 1000) / 2000) * 100;
    expect(result.grossMarginPercent).toBeCloseTo(expected);
  });
});
