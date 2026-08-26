import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import { getShippingZones, type ProvinceShipping } from '@/lib/queries/shipping';

export type ProductWithCosts = {
  id: string;
  name: string;
  product_type: string;
  purchase_price_per_kg: number | null;
  unit_cost: number | null;
  selling_price: number | null;
  packaging_box_cost: number | null;
  foam_paper_cost: number | null;
  branding_sticker_cost: number | null;
  labour_cost: number | null;
  marketing_cost_per_order: number | null;
  misc_cost: number | null;
  box_sizes: {
    id: string;
    box_size_kg: number;
    selling_price: number;
    active: boolean;
  }[];
  // variant_based products (Clothing, Beverages, ...) have no box_sizes --
  // this calculator previously only ever fetched box_sizes, so it silently
  // couldn't calculate profit for any non-fruit vendor (NIGEHBAAN included):
  // box_sizes was always [], the Save button stayed permanently disabled
  // ("box size doesn't exist yet"), and the whole page was unusable.
  variants: {
    id: string;
    attributes: Record<string, unknown>;
    label: string | null;
    selling_price: number;
    active: boolean;
  }[];
};

export type BusinessSettings = {
  payment_gateway_fee_percent: number;
  default_shipping_cost: number;
  currency: string;
};

export async function getProfitCalculatorData(): Promise<{
  products: ProductWithCosts[];
  settings: BusinessSettings;
  shippingZones: ProvinceShipping[];
}> {
  const admin = await getAdminUser();
  const supabase = await createClient();

  const [
    { data: products, error: productsError },
    { data: settings, error: settingsError },
    shippingZones,
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        `id, name, product_type, purchase_price_per_kg, unit_cost, selling_price, packaging_box_cost, foam_paper_cost,
         branding_sticker_cost, labour_cost, marketing_cost_per_order, misc_cost,
         box_sizes:product_box_sizes(id, box_size_kg, selling_price, active),
         variants:product_variants(id, attributes, label, selling_price, active)`
      )
      .eq('vendor_id', admin.vendor_id)
      .order('sort_order'),
    supabase
      .from('business_settings')
      .select('payment_gateway_fee_percent, default_shipping_cost, currency')
      .eq('vendor_id', admin.vendor_id)
      .single(),
    getShippingZones(),
  ]);

  if (productsError) {
    throw new Error(`Failed to load products for profit calculator: ${productsError.message}`);
  }
  if (settingsError) {
    throw new Error(`Failed to load business settings: ${settingsError.message}`);
  }

  return {
    products: (products ?? []).map((p) => ({
      ...p,
      box_sizes: [...p.box_sizes].sort((a, b) => a.box_size_kg - b.box_size_kg),
      variants: [...p.variants].map((v) => ({ ...v, attributes: (v.attributes ?? {}) as Record<string, unknown> })),
    })),
    settings: settings!,
    shippingZones,
  };
}
