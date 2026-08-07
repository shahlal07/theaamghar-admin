import 'server-only';
import { createClient } from '@/lib/supabase/server';

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
  source: 'box_size' | 'variant';
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

export async function getInventoryData(): Promise<{
  units: InventoryUnit[];
  auditLog: AuditLogEntry[];
}> {
  const supabase = await createClient();

  const [
    { data: boxSizes, error: boxSizesError },
    { data: variants, error: variantsError },
    { data: auditLog, error: auditError },
  ] = await Promise.all([
    supabase
      .from('product_box_sizes')
      .select('id, product_id, box_size_kg, stock_qty, low_stock_threshold, active, products(name)')
      .order('product_id')
      .order('box_size_kg'),
    supabase
      .from('product_variants')
      .select('id, product_id, attributes, label, stock_qty, low_stock_threshold, active, products(name)')
      .order('product_id')
      .order('sort_order'),
    supabase
      .from('inventory_audit_log')
      .select(
        'id, change_qty, previous_qty, new_qty, reason, note, created_at, product_box_sizes(box_size_kg), product_variants(attributes, label), products(name)'
      )
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (boxSizesError) throw new Error(`Failed to load inventory: ${boxSizesError.message}`);
  if (variantsError) throw new Error(`Failed to load inventory: ${variantsError.message}`);
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

  return {
    units: [...boxUnits, ...variantUnits],
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
