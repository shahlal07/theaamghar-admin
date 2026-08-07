'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type ActionState = { error?: string; success?: boolean } | undefined;

const CreateStaffSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['staff', 'admin']),
});

/**
 * Creates a real Supabase Auth account for a staff/admin member (via the
 * service-role Admin API, same pattern as updateCustomerEmail) and promotes
 * the profiles row `handle_new_user()` auto-creates for it. There's no
 * email-invite flow — the admin sets a temp password here and relays it to
 * the new hire directly, avoiding any dependency on email deliverability
 * for a feature that gates real panel access.
 */
export async function createStaffAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = CreateStaffSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const d = parsed.data;

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Admin client unavailable.' };
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { name: d.name },
  });
  if (createError) return { error: `Failed to create account: ${createError.message}` };

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: d.role, name: d.name })
    .eq('id', created.user.id);
  if (profileError) {
    return { error: `Account created, but failed to set role: ${profileError.message}` };
  }

  await logAdminAction(admin, 'create_staff', 'profile', created.user.id, {
    email: d.email,
    role: d.role,
  });

  revalidatePath('/admin/staff');
  return { success: true };
}

const ChangeRoleSchema = z.object({
  profileId: z.uuid(),
  role: z.enum(['staff', 'admin']),
});

export async function changeStaffRole(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = ChangeRoleSchema.safeParse({
    profileId: formData.get('profileId'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: 'Invalid input.' };

  if (parsed.data.profileId === admin.id && parsed.data.role !== 'admin') {
    return { error: "You can't demote your own account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.profileId);
  if (error) return { error: `Failed to update role: ${error.message}` };

  await logAdminAction(admin, 'change_staff_role', 'profile', parsed.data.profileId, {
    role: parsed.data.role,
  });

  revalidatePath('/admin/staff');
  return { success: true };
}

const RevokeSchema = z.object({ profileId: z.uuid() });

/**
 * Revokes panel access by dropping the account back to a plain customer
 * role, rather than deleting the auth user outright — keeps their order/
 * review history intact if they had any, and is instantly reversible via
 * changeStaffRole if it was a mistake.
 */
export async function revokeStaffAccess(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = RevokeSchema.safeParse({ profileId: formData.get('profileId') });
  if (!parsed.success) return { error: 'Invalid input.' };

  if (parsed.data.profileId === admin.id) {
    return { error: "You can't revoke your own access." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'customer' })
    .eq('id', parsed.data.profileId);
  if (error) return { error: `Failed to revoke access: ${error.message}` };

  await logAdminAction(admin, 'revoke_staff_access', 'profile', parsed.data.profileId);

  revalidatePath('/admin/staff');
  return { success: true };
}
