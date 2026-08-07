'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser, requireAdmin } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type ActionState = { error?: string; success?: boolean } | undefined;

const UpdateCustomerSchema = z.object({
  customerId: z.uuid(),
  name: z.string().min(1, 'Name is required.'),
  phone: z.string().nullable(),
});

export async function updateCustomerProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await getAdminUser();

  const rawPhone = formData.get('phone');
  const parsed = UpdateCustomerSchema.safeParse({
    customerId: formData.get('customerId'),
    name: formData.get('name'),
    phone: typeof rawPhone === 'string' && rawPhone.trim() ? rawPhone.trim() : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase
    .from('profiles')
    .update({ name: d.name, phone: d.phone })
    .eq('id', d.customerId);

  if (error) return { error: `Failed to save: ${error.message}` };

  await logAdminAction(admin, 'update_profile', 'customer', d.customerId, {
    name: d.name,
    phone: d.phone,
  });

  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${d.customerId}`);
  return { success: true };
}

const UpdateEmailSchema = z.object({
  customerId: z.uuid(),
  email: z.email('Enter a valid email address.'),
});

/**
 * Admin-triggered email change. Changing another user's login email can
 * only be done via the Supabase Admin API (service role), never the
 * regular client — there is no RLS policy that could allow this safely,
 * since it's an auth.users field, not a profiles row a policy can govern.
 */
export async function updateCustomerEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = UpdateEmailSchema.safeParse({
    customerId: formData.get('customerId'),
    email: formData.get('email'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const d = parsed.data;

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Admin client unavailable.' };
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(d.customerId, {
    email: d.email,
    email_confirm: true,
  });
  if (authError) return { error: `Failed to update email: ${authError.message}` };

  // profiles.email is only kept in sync at signup time (no DB trigger for
  // later changes), so mirror it here to avoid the admin panel and the
  // customer's real login email drifting apart.
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ email: d.email })
    .eq('id', d.customerId);
  if (profileError) {
    return {
      error: `Login email updated, but failed to sync profile record: ${profileError.message}`,
    };
  }

  await logAdminAction(admin, 'update_login_email', 'customer', d.customerId, {
    newEmail: d.email,
  });

  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${d.customerId}`);
  return { success: true };
}

const ResetPasswordSchema = z.object({ email: z.email() });

/**
 * Sends the customer a standard Supabase password-reset email — this uses
 * the regular (non-admin) client since resetPasswordForEmail is public API,
 * not an auth.admin call. The customer sets their own new password via the
 * emailed link; the admin panel never sees or sets a password directly.
 */
export async function sendPasswordResetEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = ResetPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Invalid email.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error) return { error: `Failed to send reset email: ${error.message}` };

  await logAdminAction(admin, 'send_password_reset', 'customer', null, {
    email: parsed.data.email,
  });

  return { success: true };
}
