'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type ActionState = { error?: string; success?: string } | undefined;

const EmailSchema = z.object({ email: z.email('Enter a valid email address.') });

// Self-service: the signed-in admin changing their OWN login email, via the
// regular (non service-role) client -- this uses Supabase's standard secure
// flow (confirmation link sent to the new address) rather than the
// instant-confirm admin API used for customers/staff in customers/actions.ts
// and staff/actions.ts, since here the account owner is acting on their own
// behalf and there's no reason to skip that safety check.
export async function updateOwnEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminUser();

  const parsed = EmailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid email.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) return { error: `Failed to update email: ${error.message}` };

  await logAdminAction(admin, 'request_own_email_change', 'profile', admin.id, {
    newEmail: parsed.data.email,
  });

  // profiles.email is intentionally left untouched here -- the change isn't
  // real until the confirmation link (sent to the new address) is clicked,
  // so updating it now would show a login email that doesn't work yet.
  return { success: 'Confirmation email sent to your new address. The change applies once you click the link.' };
}

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New passwords don't match.",
    path: ['confirmPassword'],
  });

// Requires re-entering the current password before applying a new one --
// defense in depth against an unattended-but-unlocked admin session (the
// existing session cookie alone is enough to call updateUser(), so this
// extra check is what actually confirms it's the account owner typing, not
// just whoever has the browser open).
export async function updateOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminUser();

  const parsed = PasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: admin.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) return { error: 'Current password is incorrect.' };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { error: `Failed to update password: ${error.message}` };

  await logAdminAction(admin, 'change_own_password', 'profile', admin.id);

  return { success: 'Password updated.' };
}
