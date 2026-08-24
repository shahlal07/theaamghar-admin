'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

export type ActionState = { error?: string; success?: boolean } | undefined;

const AdjustStockSchema = z.object({
  unitId: z.uuid(),
  source: z.enum(['box_size', 'variant', 'simple']),
  delta: z.number().int().refine((v) => v !== 0, 'Enter a non-zero adjustment.'),
  note: z.string().max(500).optional(),
});

// 'simple' model products have their one sellable unit's stock_qty on the
// products row itself, not a separate box_size/variant row -- unitId for
// that source is the product's own id.
const TABLE_BY_SOURCE = {
  box_size: 'product_box_sizes',
  variant: 'product_variants',
  simple: 'products',
} as const;

export async function adjustStock(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await getAdminUser();

  const rawNote = formData.get('note');
  const parsed = AdjustStockSchema.safeParse({
    unitId: formData.get('unitId'),
    source: formData.get('source'),
    delta: Number(formData.get('delta')),
    note: typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim() : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const d = parsed.data;
  const table = TABLE_BY_SOURCE[d.source];

  // Supabase's typed query builder needs a literal .select() string per
  // table to infer row shape, so this branches on source rather than
  // building one conditional select string for both shapes.
  let current: { id: string; product_id: string; stock_qty: number | null } | null = null;
  let fetchError: { message: string } | null = null;
  if (d.source === 'simple') {
    const res = await supabase.from('products').select('id, stock_qty').eq('id', d.unitId).single();
    current = res.data ? { id: res.data.id, product_id: res.data.id, stock_qty: res.data.stock_qty } : null;
    fetchError = res.error;
  } else {
    const res = await supabase.from(table).select('id, product_id, stock_qty').eq('id', d.unitId).single();
    current = res.data;
    fetchError = res.error;
  }

  if (fetchError || !current || current.stock_qty === null) {
    return { error: `Unit not found: ${fetchError?.message ?? 'unknown error'}` };
  }

  const productId = current.product_id;
  const newQty = Math.max(current.stock_qty + d.delta, 0);

  const { error: updateError } = await supabase
    .from(table)
    .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
    .eq('id', d.unitId);

  if (updateError) return { error: `Failed to adjust stock: ${updateError.message}` };

  const { error: logError } = await supabase.from('inventory_audit_log').insert({
    box_size_id: d.source === 'box_size' ? current.id : null,
    variant_id: d.source === 'variant' ? current.id : null,
    product_id: productId,
    change_qty: newQty - current.stock_qty,
    previous_qty: current.stock_qty,
    new_qty: newQty,
    reason: 'manual_adjustment',
    note: d.note ?? null,
  });

  if (logError) return { error: `Stock saved but failed to log: ${logError.message}` };

  revalidatePath('/admin/inventory');
  return { success: true };
}

const ThresholdSchema = z.object({
  unitId: z.uuid(),
  source: z.enum(['box_size', 'variant', 'simple']),
  threshold: z.number().int().min(0),
});

export async function updateThreshold(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await getAdminUser();

  const parsed = ThresholdSchema.safeParse({
    unitId: formData.get('unitId'),
    source: formData.get('source'),
    threshold: Number(formData.get('threshold')),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const table = TABLE_BY_SOURCE[parsed.data.source];
  const { error } = await supabase
    .from(table)
    .update({ low_stock_threshold: parsed.data.threshold, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.unitId);

  if (error) return { error: `Failed to save threshold: ${error.message}` };

  revalidatePath('/admin/inventory');
  return { success: true };
}
