import { describe, it, expect } from 'vitest';
import { formatPKR, formatPercent } from './format';

describe('formatPKR', () => {
  it('prefixes with "Rs " and adds en-PK thousands separators', () => {
    expect(formatPKR(1234567)).toBe('Rs 1,234,567');
  });

  it('rounds fractional amounts to the nearest whole rupee', () => {
    expect(formatPKR(199.6)).toBe('Rs 200');
    expect(formatPKR(199.4)).toBe('Rs 199');
  });

  it('handles zero', () => {
    expect(formatPKR(0)).toBe('Rs 0');
  });
});

describe('formatPercent', () => {
  it('defaults to 1 decimal place', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
  });

  it('respects a custom digits count', () => {
    expect(formatPercent(12.345, 2)).toBe('12.35%');
    expect(formatPercent(12, 0)).toBe('12%');
  });
});
