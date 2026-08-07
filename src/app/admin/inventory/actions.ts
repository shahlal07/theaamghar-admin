'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

export type ActionState = { error?: string; success?: boolean } | undefined;

const AdjustStockSchema = z.object({
  unitId: z.uuid(),
  source: z.enum(['box_size', 'variant']),
  delta: z.number().int().refine((v) => v !== 0, 'Enter a non-zero adjustment.'),
  note: z.string().max(500).optional(),
});

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
  const table = d.source === 'box_size' ? 'product_box_sizes' : 'product_variants';

  const { data: current, error: fetchError } = await supabase
    .from(table)
    .select('id, product_id, stock_qty')
    .eq('id', d.unitId)
    .single();

  if (fetchError || !current) {
    return { error: `Unit not found: ${fetchError?.message ?? 'unknown error'}` };
  }

  const newQty = Math.max(current.stock_qty + d.delta, 0);

  const { error: updateError } = await supabase
    .from(table)
    .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
    .eq('id', d.unitId);

  if (updateError) return { error: `Failed to adjust stock: ${updateError.message}` };

  const { error: logError } = await supabase.from('inventory_audit_log').insert({
    box_size_id: d.source === 'box_size' ? current.id : null,
    variant_id: d.source === 'variant' ? current.id : null,
    product_id: current.product_id,
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
  source: z.enum(['box_size', 'variant']),
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
  const table = parsed.data.source === 'box_size' ? 'product_box_sizes' : 'product_variants';
  const { error } = await supabase
    .from(table)
    .update({ low_stock_threshold: parsed.data.threshold, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.unitId);

  if (error) return { error: `Failed to save threshold: ${error.message}` };

  revalidatePath('/admin/inventory');
  return { success: true };
}
