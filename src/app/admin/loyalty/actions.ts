'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type LoyaltyActionState = { error?: string; success?: boolean } | undefined;

const AdjustSchema = z.object({
  profileId: z.uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, 'Enter a non-zero amount.'),
});

export async function adjustLeaderboardPoints(
  _prev: LoyaltyActionState,
  formData: FormData
): Promise<LoyaltyActionState> {
  const admin = await requireAdmin();

  const parsed = AdjustSchema.safeParse({
    profileId: formData.get('profileId'),
    delta: formData.get('delta'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_adjust_mango_points', {
    p_profile_id: parsed.data.profileId,
    p_delta: parsed.data.delta,
  });

  const result = (data as { success: boolean; message: string }[] | null)?.[0];
  if (error || !result) return { error: 'Something went wrong. Please try again.' };
  if (!result.success) return { error: result.message };

  await logAdminAction(admin, 'adjust_mango_points', 'profile', parsed.data.profileId, {
    delta: parsed.data.delta,
  });

  revalidatePath('/admin/loyalty');
  return { success: true };
}

const RemoveSchema = z.object({ profileId: z.uuid() });

export async function removeFromLeaderboard(
  _prev: LoyaltyActionState,
  formData: FormData
): Promise<LoyaltyActionState> {
  const admin = await requireAdmin();

  const parsed = RemoveSchema.safeParse({ profileId: formData.get('profileId') });
  if (!parsed.success) return { error: 'Invalid input.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_remove_from_leaderboard', {
    p_profile_id: parsed.data.profileId,
  });

  const result = (data as { success: boolean; message: string }[] | null)?.[0];
  if (error || !result) return { error: 'Something went wrong. Please try again.' };
  if (!result.success) return { error: result.message };

  await logAdminAction(admin, 'remove_from_leaderboard', 'profile', parsed.data.profileId);

  revalidatePath('/admin/loyalty');
  return { success: true };
}
