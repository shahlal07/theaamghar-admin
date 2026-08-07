'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type ActionState = { error?: string; success?: boolean } | undefined;

const ReviewSchema = z.object({
  bugId: z.uuid(),
  adminNote: z.string().trim().max(2000).optional(),
});

// Confirming is a two-table write (bug_reports.status + profiles.mango_credits)
// done atomically via the admin_confirm_bug_report RPC rather than two
// separate client calls -- same rationale as verifyPayment using a Postgres
// function instead of a direct update for anything that grants a reward.
export async function confirmBugReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminUser();

  const parsed = ReviewSchema.safeParse({
    bugId: formData.get('bugId'),
    adminNote: formData.get('adminNote') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_confirm_bug_report', {
    p_bug_id: parsed.data.bugId,
    p_admin_note: parsed.data.adminNote ?? null,
  });

  if (error) return { error: `Failed to confirm report: ${error.message}` };

  await logAdminAction(admin, 'confirm_bug_report', 'bug_report', parsed.data.bugId, {
    admin_note: parsed.data.adminNote ?? null,
  });

  revalidatePath('/admin/bugs');
  return { success: true };
}

const RejectSchema = z.object({
  bugId: z.uuid(),
  adminNote: z.string().trim().min(1, 'Please explain why this was rejected.').max(2000),
});

export async function rejectBugReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminUser();

  const parsed = RejectSchema.safeParse({
    bugId: formData.get('bugId'),
    adminNote: formData.get('adminNote'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_reject_bug_report', {
    p_bug_id: parsed.data.bugId,
    p_admin_note: parsed.data.adminNote,
  });

  if (error) return { error: `Failed to reject report: ${error.message}` };

  await logAdminAction(admin, 'reject_bug_report', 'bug_report', parsed.data.bugId, {
    admin_note: parsed.data.adminNote,
  });

  revalidatePath('/admin/bugs');
  return { success: true };
}

// The screenshots bucket is private (same convention as payment-proofs), so
// the <img> in the client needs a freshly-minted signed URL on demand
// instead of a stored public one.
export async function getBugReportScreenshotUrl(path: string): Promise<string | null> {
  await getAdminUser();
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('bug-report-screenshots')
    .createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
