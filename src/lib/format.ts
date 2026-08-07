// Matches the storefront's formatPKR convention (js/products.js) so admin
// and customer-facing currency formatting never drift apart.
export function formatPKR(amount: number): string {
  return 'Rs ' + Math.round(amount).toLocaleString('en-PK');
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
