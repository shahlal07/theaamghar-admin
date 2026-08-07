'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

const SaveCostsSchema = z.object({
  productId: z.uuid(),
  boxSizeId: z.uuid(),
  sellingPrice: z.number().min(0),
  purchasePricePerKg: z.number().min(0),
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
    boxSizeId: raw.boxSizeId,
    sellingPrice: Number(raw.sellingPrice),
    purchasePricePerKg: Number(raw.purchasePricePerKg),
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

  const [{ error: productError }, { error: boxSizeError }] = await Promise.all([
    supabase
      .from('products')
      .update({
        purchase_price_per_kg: d.purchasePricePerKg,
        packaging_box_cost: d.packagingBoxCost,
        foam_paper_cost: d.foamPaperCost,
        branding_sticker_cost: d.brandingStickerCost,
        labour_cost: d.labourCost,
        marketing_cost_per_order: d.marketingCostPerOrder,
        misc_cost: d.miscCost,
      })
      .eq('id', d.productId),
    supabase
      .from('product_box_sizes')
      .update({ selling_price: d.sellingPrice, updated_at: new Date().toISOString() })
      .eq('id', d.boxSizeId),
  ]);

  if (productError || boxSizeError) {
    return {
      error: `Failed to save: ${productError?.message ?? boxSizeError?.message}`,
    };
  }

  revalidatePath('/admin/profit-calculator');
  return { success: true };
}
