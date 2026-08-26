'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

const SaveCostsSchema = z.object({
  productId: z.uuid(),
  // 'weight_based' saves to product_box_sizes.selling_price (unitId = box
  // size id); 'variant_based' saves to product_variants.selling_price
  // (unitId = variant id); 'simple' has no sub-unit row at all -- the price
  // saves straight onto products.selling_price and unitId is unused.
  model: z.enum(['weight_based', 'variant_based', 'simple']),
  unitId: z.uuid().nullable(),
  sellingPrice: z.number().min(0),
  purchasePricePerKg: z.number().min(0),
  unitCost: z.number().min(0),
  packagingBoxCost: z.number().min(0),
  foamPaperCost: z.number().min(0),
  brandingStickerCost: z.number().min(0),
  labourCost: z.number().min(0),
  marketingCostPerOrder: z.number().min(0),
  miscCost: z.number().min(0),
});

export type SaveCostsState = { error?: string; success?: boolean } | undefined;

export async function saveCosts(
  _prev: SaveCostsState,
  formData: FormData
): Promise<SaveCostsState> {
  // Authorization is enforced again here (not just relying on the layout
  // having checked once) — Server Actions are public endpoints and must
  // verify on their own, per Next.js's data-security guidance.
  await getAdminUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = SaveCostsSchema.safeParse({
    productId: raw.productId,
    model: raw.model,
    unitId: raw.unitId ? raw.unitId : null,
    sellingPrice: Number(raw.sellingPrice),
    purchasePricePerKg: Number(raw.purchasePricePerKg),
    unitCost: Number(raw.unitCost),
    packagingBoxCost: Number(raw.packagingBoxCost),
    foamPaperCost: Number(raw.foamPaperCost),
    brandingStickerCost: Number(raw.brandingStickerCost),
    labourCost: Number(raw.labourCost),
    marketingCostPerOrder: Number(raw.marketingCostPerOrder),
    miscCost: Number(raw.miscCost),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const d = parsed.data;

  if (d.model !== 'simple' && !d.unitId) {
    return { error: 'Select a box size or variant before saving.' };
  }

  const productUpdate: Record<string, number> =
    d.model === 'weight_based'
      ? { purchase_price_per_kg: d.purchasePricePerKg }
      : { unit_cost: d.unitCost };
  productUpdate.packaging_box_cost = d.packagingBoxCost;
  productUpdate.foam_paper_cost = d.foamPaperCost;
  productUpdate.branding_sticker_cost = d.brandingStickerCost;
  productUpdate.labour_cost = d.labourCost;
  productUpdate.marketing_cost_per_order = d.marketingCostPerOrder;
  productUpdate.misc_cost = d.miscCost;
  if (d.model === 'simple') productUpdate.selling_price = d.sellingPrice;

  const updates: PromiseLike<{ error: { message: string } | null }>[] = [
    supabase.from('products').update(productUpdate).eq('id', d.productId),
  ];
  if (d.model === 'weight_based') {
    updates.push(
      supabase
        .from('product_box_sizes')
        .update({ selling_price: d.sellingPrice, updated_at: new Date().toISOString() })
        .eq('id', d.unitId!)
    );
  } else if (d.model === 'variant_based') {
    updates.push(supabase.from('product_variants').update({ selling_price: d.sellingPrice }).eq('id', d.unitId!));
  }

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { error: `Failed to save: ${failed.error.message}` };
  }

  revalidatePath('/admin/profit-calculator');
  return { success: true };
}
