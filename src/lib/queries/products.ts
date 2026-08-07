import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  product_type: string;
  // Derived by the sync_product_price_unit DB trigger from the cheapest
  // active box size/variant -- null only if the product has none yet.
  price: number | null;
  unit: string | null;
  image: string | null;
  is_seasonal: boolean;
  category_name: string | null;
  box_size_count: number;
  total_stock: number;
};

export type ProductBoxSizeInput = {
  id: string | null;
  box_size_kg: number;
  selling_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  active: boolean;
};

export type ProductVariantInput = {
  id: string | null;
  attributes: Record<string, string>;
  label: string | null;
  selling_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  active: boolean;
};

export type ProductDetail = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  slug: string;
  name: string;
  product_type: string;
  attributes: Record<string, unknown>;
  unit_cost: number | null;
  origin: string | null;
  season: string | null;
  sweetness: string | null;
  fiber: string | null;
  tagline: string | null;
  description: string[];
  price: number | null;
  discount_price: number | null;
  unit: string | null;
  weight_note: string | null;
  image: string | null;
  gallery: string[];
  status: string;
  sort_order: number;
  purchase_price_per_kg: number | null;
  packaging_box_cost: number | null;
  foam_paper_cost: number | null;
  branding_sticker_cost: number | null;
  labour_cost: number | null;
  marketing_cost_per_order: number | null;
  misc_cost: number | null;
  is_seasonal: boolean;
  harvest_season_start: string | null;
  harvest_season_end: string | null;
  box_sizes: ProductBoxSizeInput[];
  variants: ProductVariantInput[];
  has_order_history: boolean;
};

export type Category = { id: string; name: string };

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').select('id, name').order('name');
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data ?? [];
}

export async function getVendorId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('vendors').select('id').limit(1).single();
  if (error || !data) throw new Error('No vendor row found — cannot create products.');
  return data.id;
}

export async function getProductsList(): Promise<ProductListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      `id, name, slug, status, product_type, price, unit, image, is_seasonal,
       categories(name),
       box_sizes:product_box_sizes(stock_qty),
       variants:product_variants(stock_qty)`
    )
    .order('sort_order')
    // Circuit-breaker, not a real limit at today's catalog size -- degrades
    // gracefully instead of an unbounded fetch failing outright.
    .limit(10000);

  if (error) throw new Error(`Failed to load products: ${error.message}`);

  type Row = {
    id: string;
    name: string;
    slug: string;
    status: string;
    product_type: string;
    price: number | null;
    unit: string | null;
    image: string | null;
    is_seasonal: boolean;
    categories: { name: string } | { name: string }[] | null;
    box_sizes: { stock_qty: number }[];
    variants: { stock_qty: number }[];
  };

  const oneOrNull = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  // Fruit sells through product_box_sizes, everything else through
  // product_variants -- only one of the two is ever populated per product,
  // so a plain sum of both is safe and needs no product_type branch here.
  return ((data ?? []) as Row[]).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
    product_type: p.product_type,
    price: p.price,
    unit: p.unit,
    image: p.image,
    is_seasonal: p.is_seasonal,
    category_name: oneOrNull(p.categories)?.name ?? null,
    box_size_count: p.box_sizes.length + p.variants.length,
    total_stock:
      p.box_sizes.reduce((sum, b) => sum + b.stock_qty, 0) +
      p.variants.reduce((sum, v) => sum + v.stock_qty, 0),
  }));
}

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      `id, vendor_id, category_id, slug, name, product_type, attributes, unit_cost,
       origin, season, sweetness, fiber, tagline,
       description, price, discount_price, unit, weight_note, image, gallery, status, sort_order,
       purchase_price_per_kg, packaging_box_cost, foam_paper_cost, branding_sticker_cost,
       labour_cost, marketing_cost_per_order, misc_cost, is_seasonal,
       harvest_season_start, harvest_season_end,
       box_sizes:product_box_sizes(id, box_size_kg, selling_price, stock_qty, low_stock_threshold, active),
       variants:product_variants(id, attributes, label, selling_price, stock_qty, low_stock_threshold, active, sort_order)`
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;

  // Powers the admin form's "don't let a product with real history change
  // type" guard -- retyping a product with live stock/order data is a
  // correctness hazard for the stock/profit triggers, not just a UI nicety.
  const { data: hasHistory } = await supabase.rpc('product_has_order_history', {
    p_product_id: id,
  });

  return {
    ...data,
    attributes: (data.attributes ?? {}) as Record<string, unknown>,
    box_sizes: [...data.box_sizes]
      .sort((a, b) => a.box_size_kg - b.box_size_kg)
      .map((b) => ({ ...b })),
    variants: [...data.variants]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({ ...v, attributes: (v.attributes ?? {}) as Record<string, string> })),
    has_order_history: hasHistory ?? false,
  };
}
