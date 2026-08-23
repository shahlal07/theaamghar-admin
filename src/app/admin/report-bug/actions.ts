'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type ActionState = { error?: string; success?: boolean } | undefined;

const ReportSchema = z.object({
  title: z.string().trim().min(3, 'Give it a short title.').max(200),
  description: z.string().trim().min(10, 'Describe what went wrong in a bit more detail.').max(5000),
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Vendor admins can freely report bugs found on nashemann.store, their own
// storefront, or this admin panel itself -- straight to the superadmin, no
// gatekeeping. Reuses the same bug_reports table the storefront's own
// "Report a Bug" feature writes to, tagged source='vendor_admin' so it's
// distinguishable from customer-submitted reports (and excluded from the
// customer-facing Bug Reports review queue on this app's /admin/bugs page).
export async function submitVendorBugReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminUser();

  const parsed = ReportSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const screenshot = formData.get('screenshot');
  const supabase = await createClient();

  let screenshotPath: string | null = null;
  if (screenshot instanceof File && screenshot.size > 0) {
    if (!ALLOWED_TYPES.includes(screenshot.type)) {
      return { error: `Unsupported screenshot type: ${screenshot.type || 'unknown'}` };
    }
    if (screenshot.size > 5 * 1024 * 1024) {
      return { error: 'Screenshot is larger than 5MB.' };
    }
    const ext = screenshot.name.split('.').pop() || 'png';
    const path = `${admin.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('bug-report-screenshots')
      .upload(path, screenshot, { contentType: screenshot.type, upsert: false });
    if (uploadError) return { error: `Screenshot upload failed: ${uploadError.message}` };
    screenshotPath = path;
  }

  const { data: inserted, error } = await supabase
    .from('bug_reports')
    .insert({
      profile_id: admin.id,
      title: parsed.data.title,
      description: parsed.data.description,
      screenshot_path: screenshotPath,
      source: 'vendor_admin',
    })
    .select('id')
    .single();

  if (error) return { error: `Failed to submit report: ${error.message}` };

  await logAdminAction(admin, 'submit_bug_report', 'bug_report', inserted.id, {
    title: parsed.data.title,
    vendor_name: admin.vendor_name,
  });

  return { success: true };
}
