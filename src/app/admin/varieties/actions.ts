'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

const VarietySchema = z.object({
  productId: z.uuid(),
  purchasePricePerKg: z.number().min(0),
  isSeasonal: z.boolean(),
  harvestSeasonStart: z.string().nullable(),
  harvestSeasonEnd: z.string().nullable(),
});

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function updateVariety(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await getAdminUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = VarietySchema.safeParse({
    productId: raw.productId,
    purchasePricePerKg: Number(raw.purchasePricePerKg),
    isSeasonal: raw.isSeasonal === 'true',
    harvestSeasonStart: raw.harvestSeasonStart || null,
    harvestSeasonEnd: raw.harvestSeasonEnd || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from('products')
    .update({
      purchase_price_per_kg: d.purchasePricePerKg,
      is_seasonal: d.isSeasonal,
      harvest_season_start: d.harvestSeasonStart,
      harvest_season_end: d.harvestSeasonEnd,
    })
    .eq('id', d.productId);

  if (error) return { error: `Failed to save: ${error.message}` };

  revalidatePath('/admin/varieties');
  return { success: true };
}

const StockSchema = z.object({
  boxSizeId: z.uuid(),
  stockQty: z.number().int().min(0),
  sellingPrice: z.number().min(0),
});

export async function updateBoxSize(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await getAdminUser();

  const parsed = StockSchema.safeParse({
    boxSizeId: formData.get('boxSizeId'),
    stockQty: Number(formData.get('stockQty')),
    sellingPrice: Number(formData.get('sellingPrice')),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from('product_box_sizes')
    .update({
      stock_qty: d.stockQty,
      selling_price: d.sellingPrice,
      updated_at: new Date().toISOString(),
    })
    .eq('id', d.boxSizeId);

  if (error) return { error: `Failed to save: ${error.message}` };

  revalidatePath('/admin/varieties');
  return { success: true };
}
