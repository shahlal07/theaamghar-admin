'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';

export type ActionState = { error?: string; success?: boolean } | undefined;

const RateSchema = z.object({
  zoneId: z.uuid(),
  rate: z.number().min(0),
});

export async function updateZoneRate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = RateSchema.safeParse({
    zoneId: formData.get('zoneId'),
    rate: Number(formData.get('rate')),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('shipping_zones')
    .update({ rate: parsed.data.rate, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.zoneId);

  if (error) return { error: `Failed to save: ${error.message}` };

  revalidatePath('/admin/shipping');
  return { success: true };
}

const AddOverrideSchema = z.object({
  province: z.string().min(1),
  city: z.string().min(1),
  rate: z.number().min(0),
});

export async function addCityOverride(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = AddOverrideSchema.safeParse({
    province: formData.get('province'),
    city: formData.get('city'),
    rate: Number(formData.get('rate')),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const d = parsed.data;

  // Partial unique index (province, city) where city is not null can't be
  // targeted by supabase-js's upsert onConflict (no WHERE clause support),
  // so resolve the conflict manually: update if an override already exists
  // for this exact province+city, otherwise insert a new row.
  const { data: existing } = await supabase
    .from('shipping_zones')
    .select('id')
    .eq('province', d.province)
    .eq('city', d.city)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from('shipping_zones')
        .update({ rate: d.rate, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    : await supabase
        .from('shipping_zones')
        .insert({ province: d.province, city: d.city, rate: d.rate });

  if (error) return { error: `Failed to add override: ${error.message}` };

  revalidatePath('/admin/shipping');
  return { success: true };
}

const DeleteOverrideSchema = z.object({ zoneId: z.uuid() });

export async function deleteCityOverride(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = DeleteOverrideSchema.safeParse({ zoneId: formData.get('zoneId') });
  if (!parsed.success) {
    return { error: 'Invalid input.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('shipping_zones')
    .delete()
    .eq('id', parsed.data.zoneId)
    .not('city', 'is', null);

  if (error) return { error: `Failed to remove override: ${error.message}` };

  revalidatePath('/admin/shipping');
  return { success: true };
}
