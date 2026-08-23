import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

export type VarietyBoxSize = {
  id: string;
  box_size_kg: number;
  selling_price: number;
  stock_qty: number;
  active: boolean;
};

export type Variety = {
  id: string;
  name: string;
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
  box_sizes: VarietyBoxSize[];
};

export async function getVarieties(): Promise<{
  varieties: Variety[];
  gatewayFeePercent: number;
  defaultShippingCost: number;
}> {
  const admin = await getAdminUser();
  const supabase = await createClient();

  const [{ data: varieties, error }, { data: settings }] = await Promise.all([
    supabase
      .from('products')
      .select(
        `id, name, purchase_price_per_kg, packaging_box_cost, foam_paper_cost,
         branding_sticker_cost, labour_cost, marketing_cost_per_order, misc_cost,
         is_seasonal, harvest_season_start, harvest_season_end,
         box_sizes:product_box_sizes(id, box_size_kg, selling_price, stock_qty, active)`
      )
      // This page is a fruit-specific convenience view over `products`
      // (there's no separate varieties table) -- without this filter, a
      // clothing/other product (null harvest dates, no purchase-price-per-kg)
      // would pollute this list the moment one exists.
      .eq('product_type', 'fruit')
      .eq('vendor_id', admin.vendor_id)
      .order('sort_order'),
    supabase
      .from('business_settings')
      .select('payment_gateway_fee_percent, default_shipping_cost')
      .eq('vendor_id', admin.vendor_id)
      .single(),
  ]);

  if (error) throw new Error(`Failed to load varieties: ${error.message}`);

  return {
    varieties: (varieties ?? []).map((v) => ({
      ...v,
      box_sizes: [...v.box_sizes].sort((a, b) => a.box_size_kg - b.box_size_kg),
    })),
    gatewayFeePercent: settings?.payment_gateway_fee_percent ?? 2.9,
    defaultShippingCost: settings?.default_shipping_cost ?? 250,
  };
}
