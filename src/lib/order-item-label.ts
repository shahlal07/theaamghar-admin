// Mirrors theaamghar-web's variant-label.ts convention (same cross-repo
// duplication pattern already used for formatPKR/order-status.ts) -- an
// order line built by the new (post-product-type) checkout carries a
// precomputed `variant_label` ("M / Blue"); every order placed before that
// still only has `box_size_kg`, so falling back to `${box_size_kg}kg`
// reproduces today's exact display for every existing order.
export function getOrderItemLabel(item: { box_size_kg?: number; variant_label?: string }): string {
  if (item.variant_label) return item.variant_label;
  if (typeof item.box_size_kg === 'number') return `${item.box_size_kg}kg`;
  return '';
}
