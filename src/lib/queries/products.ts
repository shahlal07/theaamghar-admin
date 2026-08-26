import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import type { CategorySchema } from '@/lib/product-types';
import { getCategorySchema } from '@/lib/category-schema.server';

export type ProductListItem = { id: string; name: string; slug: string; status: string; product_type: string; price: number | null; unit: string | null; image: string | null; is_seasonal: boolean; category_name: string | null; box_size_count: number; total_stock: number };
export type ProductBoxSizeInput = { id: string | null; box_size_kg: number; selling_price: number; stock_qty: number; low_stock_threshold: number; active: boolean };
export type ProductVariantInput = { id: string | null; attributes: Record<string, string>; label: string | null; selling_price: number; stock_qty: number; low_stock_threshold: number; active: boolean };
export type ProductDetail = { id: string; vendor_id: string; category_id: string | null; slug: string; name: string; product_type: string; attributes: Record<string, unknown>; unit_cost: number | null; origin: string | null; season: string | null; sweetness: string | null; fiber: string | null; tagline: string | null; description: string[]; price: number | null; discount_price: number | null; unit: string | null; weight_note: string | null; image: string | null; gallery: string[]; video_url: string | null; status: string; sort_order: number; purchase_price_per_kg: number | null; packaging_box_cost: number | null; foam_paper_cost: number | null; branding_sticker_cost: number | null; labour_cost: number | null; marketing_cost_per_order: number | null; misc_cost: number | null; is_seasonal: boolean; harvest_season_start: string | null; harvest_season_end: string | null; selling_price: number | null; stock_qty: number | null; low_stock_threshold: number; box_sizes: ProductBoxSizeInput[]; variants: ProductVariantInput[]; has_order_history: boolean };
export type Category = { id: string; name: string };

// This is the vendor's own free-form product-organization category (e.g.
// "Mangoes", "clothing" -- a `categories` table row a vendor creates for
// itself to group its catalog). It is unrelated to `vendors.category` (the
// marketplace-wide category the superadmin assigns, e.g. "Fruits",
// "Clothing") that drives which fields getVendorCategorySchema() returns
// below -- don't conflate the two despite the similar name.
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const admin = await getAdminUser();
  const { data, error } = await supabase.from('categories').select('id, name').eq('vendor_id', admin.vendor_id).order('name');
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data ?? [];
}

export async function getVendorId(): Promise<string> {
  const admin = await getAdminUser();
  return admin.vendor_id;
}

// The schema that drives which product fields/mechanics this vendor's admin
// sees, resolved from their fixed `vendors.category`. Null means the
// superadmin hasn't assigned a category yet -- callers (the products/new
// and products/[id] pages) must block product creation/editing with a
// clear message in that case rather than guessing a default.
export async function getVendorCategorySchema(): Promise<CategorySchema | null> {
  const admin = await getAdminUser();
  return getCategorySchema(admin.vendor_category);
}

export async function getProductsList(): Promise<ProductListItem[]> {
  const supabase = await createClient();
  const admin = await getAdminUser();
  const { data, error } = await supabase.from('products').select(`id, name, slug, status, product_type, price, unit, image, is_seasonal, stock_qty, categories(name), box_sizes:product_box_sizes(stock_qty), variants:product_variants(stock_qty)`).eq('vendor_id', admin.vendor_id).order('sort_order').limit(10000);
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  type Row = { id: string; name: string; slug: string; status: string; product_type: string; price: number | null; unit: string | null; image: string | null; is_seasonal: boolean; stock_qty: number | null; categories: { name: string } | { name: string }[] | null; box_sizes: { stock_qty: number }[]; variants: { stock_qty: number }[] };
  const oneOrNull = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
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
    // 'simple' model products have no box_sizes/variants rows at all --
    // their one sellable unit is the product row's own stock_qty.
    box_size_count: p.box_sizes.length + p.variants.length + (p.stock_qty !== null ? 1 : 0),
    total_stock:
      p.box_sizes.reduce((sum, b) => sum + b.stock_qty, 0) +
      p.variants.reduce((sum, v) => sum + v.stock_qty, 0) +
      (p.stock_qty ?? 0),
  }));
}

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const admin = await getAdminUser();
  const { data, error } = await supabase.from('products').select(`id, vendor_id, category_id, slug, name, product_type, attributes, unit_cost, origin, season, sweetness, fiber, tagline, description, price, discount_price, unit, weight_note, image, gallery, video_url, status, sort_order, purchase_price_per_kg, packaging_box_cost, foam_paper_cost, branding_sticker_cost, labour_cost, marketing_cost_per_order, misc_cost, is_seasonal, harvest_season_start, harvest_season_end, selling_price, stock_qty, low_stock_threshold, box_sizes:product_box_sizes(id, box_size_kg, selling_price, stock_qty, low_stock_threshold, active), variants:product_variants(id, attributes, label, selling_price, stock_qty, low_stock_threshold, active, sort_order)`).eq('id', id).eq('vendor_id', admin.vendor_id).maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;
  const { data: hasHistory } = await supabase.rpc('product_has_order_history', { p_product_id: id });
  return { ...data, attributes: (data.attributes ?? {}) as Record<string, unknown>, box_sizes: [...data.box_sizes].sort((a, b) => a.box_size_kg - b.box_size_kg).map((b) => ({ ...b })), variants: [...data.variants].sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ ...v, attributes: (v.attributes ?? {}) as Record<string, string> })), has_order_history: hasHistory ?? false };
}
