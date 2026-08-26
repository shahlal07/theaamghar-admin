import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

export type StockState = 'out_of_stock' | 'low_stock' | 'in_stock';

export function getStockState(stockQty: number, lowStockThreshold: number): StockState {
  if (stockQty <= 0) return 'out_of_stock';
  if (stockQty <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

// One row per sellable unit regardless of product type -- fruit's
// product_box_sizes and everything else's product_variants are normalized
// into the same shape here so the rest of this page's UI/logic never needs
// to branch on product_type.
export type InventoryUnit = {
  id: string;
  source: 'box_size' | 'variant' | 'simple';
  product_id: string;
  product_name: string;
  label: string;
  stock_qty: number;
  low_stock_threshold: number;
  active: boolean;
  state: StockState;
};

export type AuditLogEntry = {
  id: string;
  product_name: string;
  label: string;
  change_qty: number;
  previous_qty: number;
  new_qty: number;
  reason: string;
  note: string | null;
  created_at: string;
};

function variantLabel(attributes: Record<string, unknown>, label: string | null): string {
  if (label) return label;
  const values = Object.values(attributes).filter((v): v is string => typeof v === 'string' && v.length > 0);
  return values.length > 0 ? values.join(' / ') : 'Standard';
}

export type SizeBreakdownRow = {
  size: string;
  productCount: number;
  activeVariantCount: number;
  totalStock: number;
};

// Matches the variant attribute key an admin uses for size, whatever case
// they typed it in (the "Size" attribute editor on the product form writes
// it as typed, not normalized) -- "Size", "size", "SIZE" all count.
const SIZE_KEY_PATTERN = /^size$/i;

function extractSizeValue(attributes: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(attributes)) {
    if (SIZE_KEY_PATTERN.test(key) && typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export async function getInventoryData(): Promise<{
  units: InventoryUnit[];
  auditLog: AuditLogEntry[];
  sizeBreakdown: SizeBreakdownRow[];
}> {
  const supabase = await createClient();
  const admin = await getAdminUser();

  // Explicit vendor_id filters here, not just a reliance on RLS: the
  // "publicly readable when product is published" SELECT policies on
  // product_box_sizes/product_variants gate on `is_staff_or_admin()` alone
  // (not scoped to the caller's own vendor like the UPDATE/DELETE policies
  // are), so without this filter every vendor admin would see every other
  // vendor's stock levels here. inventory_audit_log has no such loophole
  // (no public SELECT policy at all) but is filtered too for consistency
  // and to keep the "recent activity" list scoped to this vendor's own
  // orders/adjustments.
  const [
    { data: boxSizes, error: boxSizesError },
    { data: variants, error: variantsError },
    { data: simpleProducts, error: simpleError },
    { data: auditLog, error: auditError },
  ] = await Promise.all([
    supabase
      .from('product_box_sizes')
      .select('id, product_id, box_size_kg, stock_qty, low_stock_threshold, active, products(name)')
      .eq('vendor_id', admin.vendor_id)
      .order('product_id')
      .order('box_size_kg'),
    supabase
      .from('product_variants')
      .select('id, product_id, attributes, label, stock_qty, low_stock_threshold, active, products(name)')
      .eq('vendor_id', admin.vendor_id)
      .order('product_id')
      .order('sort_order'),
    // 'simple' model products (single price/stock on the product row
    // itself, no box_sizes/variants rows) -- product_type is only ever
    // literally 'simple' for products created/edited through the new
    // category-schema-driven form.
    supabase
      .from('products')
      .select('id, name, status, stock_qty, low_stock_threshold')
      .eq('vendor_id', admin.vendor_id)
      .eq('product_type', 'simple')
      .not('stock_qty', 'is', null),
    supabase
      .from('inventory_audit_log')
      .select(
        'id, change_qty, previous_qty, new_qty, reason, note, created_at, product_box_sizes(box_size_kg), product_variants(attributes, label), products(name)'
      )
      .eq('vendor_id', admin.vendor_id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (boxSizesError) throw new Error(`Failed to load inventory: ${boxSizesError.message}`);
  if (variantsError) throw new Error(`Failed to load inventory: ${variantsError.message}`);
  if (simpleError) throw new Error(`Failed to load inventory: ${simpleError.message}`);
  if (auditError) throw new Error(`Failed to load audit log: ${auditError.message}`);

  type BoxSizeRow = {
    id: string;
    product_id: string;
    box_size_kg: number;
    stock_qty: number;
    low_stock_threshold: number;
    active: boolean;
    products: { name: string } | { name: string }[] | null;
  };

  type VariantRow = {
    id: string;
    product_id: string;
    attributes: Record<string, unknown>;
    label: string | null;
    stock_qty: number;
    low_stock_threshold: number;
    active: boolean;
    products: { name: string } | { name: string }[] | null;
  };

  type AuditRow = {
    id: string;
    change_qty: number;
    previous_qty: number;
    new_qty: number;
    reason: string;
    note: string | null;
    created_at: string;
    product_box_sizes: { box_size_kg: number } | { box_size_kg: number }[] | null;
    product_variants:
      | { attributes: Record<string, unknown>; label: string | null }
      | { attributes: Record<string, unknown>; label: string | null }[]
      | null;
    products: { name: string } | { name: string }[] | null;
  };

  const oneOrNull = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const boxUnits: InventoryUnit[] = ((boxSizes ?? []) as BoxSizeRow[]).map((b) => ({
    id: b.id,
    source: 'box_size',
    product_id: b.product_id,
    product_name: oneOrNull(b.products)?.name ?? 'Unknown',
    label: `${b.box_size_kg}kg`,
    stock_qty: b.stock_qty,
    low_stock_threshold: b.low_stock_threshold,
    active: b.active,
    state: getStockState(b.stock_qty, b.low_stock_threshold),
  }));

  const variantUnits: InventoryUnit[] = ((variants ?? []) as VariantRow[]).map((v) => ({
    id: v.id,
    source: 'variant',
    product_id: v.product_id,
    product_name: oneOrNull(v.products)?.name ?? 'Unknown',
    label: variantLabel(v.attributes ?? {}, v.label),
    stock_qty: v.stock_qty,
    low_stock_threshold: v.low_stock_threshold,
    active: v.active,
    state: getStockState(v.stock_qty, v.low_stock_threshold),
  }));

  type SimpleProductRow = {
    id: string;
    name: string;
    status: string;
    stock_qty: number | null;
    low_stock_threshold: number;
  };

  // 'simple' products have exactly one sellable unit -- the product row
  // itself -- so there's no separate active/inactive toggle the way a box
  // size or variant row has; it's considered active whenever the product
  // isn't archived.
  const simpleUnits: InventoryUnit[] = ((simpleProducts ?? []) as SimpleProductRow[])
    .filter((p) => p.stock_qty !== null)
    .map((p) => ({
      id: p.id,
      source: 'simple',
      product_id: p.id,
      product_name: p.name,
      label: 'Standard',
      stock_qty: p.stock_qty as number,
      low_stock_threshold: p.low_stock_threshold,
      active: p.status !== 'archived',
      state: getStockState(p.stock_qty as number, p.low_stock_threshold),
    }));

  // "How many products/how much stock exists per size" -- grouped from the
  // same variant rows already fetched above, active variants only (a
  // disabled size variant isn't really "available"). One product can
  // contribute to multiple sizes, so productCount counts distinct
  // product_id per size, not variant rows.
  const bySize = new Map<string, { productIds: Set<string>; activeVariantCount: number; totalStock: number }>();
  for (const v of (variants ?? []) as VariantRow[]) {
    if (!v.active) continue;
    const size = extractSizeValue(v.attributes ?? {});
    if (!size) continue;
    const entry = bySize.get(size) ?? { productIds: new Set(), activeVariantCount: 0, totalStock: 0 };
    entry.productIds.add(v.product_id);
    entry.activeVariantCount += 1;
    entry.totalStock += v.stock_qty;
    bySize.set(size, entry);
  }
  const sizeBreakdown: SizeBreakdownRow[] = [...bySize.entries()]
    .map(([size, e]) => ({
      size,
      productCount: e.productIds.size,
      activeVariantCount: e.activeVariantCount,
      totalStock: e.totalStock,
    }))
    .sort((a, b) => b.totalStock - a.totalStock);

  return {
    units: [...boxUnits, ...variantUnits, ...simpleUnits],
    sizeBreakdown,
    auditLog: ((auditLog ?? []) as AuditRow[]).map((a) => {
      const box = oneOrNull(a.product_box_sizes);
      const variant = oneOrNull(a.product_variants);
      return {
        id: a.id,
        product_name: oneOrNull(a.products)?.name ?? 'Unknown',
        label: box ? `${box.box_size_kg}kg` : variant ? variantLabel(variant.attributes ?? {}, variant.label) : '—',
        change_qty: a.change_qty,
        previous_qty: a.previous_qty,
        new_qty: a.new_qty,
        reason: a.reason,
        note: a.note,
        created_at: a.created_at,
      };
    }),
  };
}
