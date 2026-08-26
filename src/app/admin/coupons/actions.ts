'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type ActionState = { error?: string; success?: boolean } | undefined;

const CouponSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Code must be at least 3 characters.')
      .max(30)
      .regex(/^[A-Z0-9-]+$/, 'Use only uppercase letters, numbers, and hyphens.'),
    discountType: z.enum(['percent', 'fixed', 'free_shipping']),
    discountValue: z.number().min(0),
    minOrderAmount: z.number().min(0),
    maxUses: z.number().int().positive().nullable(),
    active: z.boolean(),
    startsAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
  })
  .refine((d) => d.discountType !== 'percent' || (d.discountValue > 0 && d.discountValue <= 100), {
    message: 'Percent discount must be between 0 and 100.',
    path: ['discountValue'],
  })
  .refine((d) => d.discountType !== 'fixed' || d.discountValue > 0, {
    message: 'Fixed discount must be greater than 0.',
    path: ['discountValue'],
  });

function parseCouponForm(formData: FormData) {
  const strOrNull = (v: FormDataEntryValue | null) =>
    v === null || String(v).trim() === '' ? null : String(v);
  const raw = Object.fromEntries(formData.entries());

  return CouponSchema.safeParse({
    code: String(raw.code || '').toUpperCase().trim(),
    discountType: raw.discountType,
    discountValue: Number(raw.discountValue),
    minOrderAmount: Number(raw.minOrderAmount || 0),
    maxUses: raw.maxUses ? Number(raw.maxUses) : null,
    active: raw.active === 'true',
    startsAt: strOrNull(raw.startsAt),
    expiresAt: strOrNull(raw.expiresAt),
  });
}

export async function createCoupon(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = parseCouponForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const d = parsed.data;
  const { data: inserted, error } = await supabase
    .from('coupons')
    .insert({
      code: d.code,
      // vendor_id has no default and the coupons_scope_vendor_consistency
      // check (scope='vendor' requires a real vendor_id) rejects a bare
      // insert without it -- this was previously omitted entirely, which
      // also failed the RLS insert policy's `vendor_id = current_vendor_id()`
      // check for every regular vendor admin (a super admin's insert would
      // have silently gone through with vendor_id null, i.e. accidentally
      // universal). "Create Coupon" was non-functional for every vendor
      // until this was set explicitly.
      vendor_id: admin.vendor_id,
      scope: 'vendor',
      discount_type: d.discountType,
      discount_value: d.discountValue,
      min_order_amount: d.minOrderAmount,
      max_uses: d.maxUses,
      active: d.active,
      starts_at: d.startsAt,
      expires_at: d.expiresAt,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { error: `Coupon code "${d.code}" already exists.` };
    return { error: `Failed to create coupon: ${error.message}` };
  }

  await logAdminAction(admin, 'create', 'coupon', inserted?.id ?? null, { code: d.code });

  revalidatePath('/admin/coupons');
  return { success: true };
}

export async function updateCoupon(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const couponId = String(formData.get('couponId') || '');
  if (!z.uuid().safeParse(couponId).success) return { error: 'Invalid coupon id.' };

  const parsed = parseCouponForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase
    .from('coupons')
    .update({
      code: d.code,
      discount_type: d.discountType,
      discount_value: d.discountValue,
      min_order_amount: d.minOrderAmount,
      max_uses: d.maxUses,
      active: d.active,
      starts_at: d.startsAt,
      expires_at: d.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', couponId);

  if (error) {
    if (error.code === '23505') return { error: `Coupon code "${d.code}" already exists.` };
    return { error: `Failed to save coupon: ${error.message}` };
  }

  await logAdminAction(admin, 'update', 'coupon', couponId, { code: d.code });

  revalidatePath('/admin/coupons');
  return { success: true };
}

const ToggleSchema = z.object({ couponId: z.uuid(), active: z.boolean() });

export async function toggleCouponActive(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = ToggleSchema.safeParse({
    couponId: formData.get('couponId'),
    active: formData.get('active') === 'true',
  });
  if (!parsed.success) return { error: 'Invalid input.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('coupons')
    .update({ active: parsed.data.active, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.couponId);

  if (error) return { error: `Failed to update: ${error.message}` };

  await logAdminAction(admin, 'toggle_active', 'coupon', parsed.data.couponId, {
    active: parsed.data.active,
  });

  revalidatePath('/admin/coupons');
  return { success: true };
}

const DeleteSchema = z.object({ couponId: z.uuid() });

export async function deleteCoupon(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = DeleteSchema.safeParse({ couponId: formData.get('couponId') });
  if (!parsed.success) return { error: 'Invalid input.' };

  const supabase = await createClient();

  const { data: coupon } = await supabase
    .from('coupons')
    .select('code, used_count')
    .eq('id', parsed.data.couponId)
    .maybeSingle();

  if (coupon && coupon.used_count > 0) {
    return {
      error: 'This coupon has already been used on orders — deactivate it instead of deleting.',
    };
  }

  const { error } = await supabase.from('coupons').delete().eq('id', parsed.data.couponId);
  if (error) return { error: `Failed to delete: ${error.message}` };

  await logAdminAction(admin, 'delete', 'coupon', parsed.data.couponId, {
    code: coupon?.code,
  });

  revalidatePath('/admin/coupons');
  return { success: true };
}
