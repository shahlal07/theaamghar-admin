'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';
import { sendAnnouncementEmail } from '@/lib/email';

export type SendAnnouncementState =
  | { error: string }
  | { success: true; recipientCount: number }
  | undefined;

// Only these two are "admin blasts everyone" categories -- price/stock
// alerts are inherently per-product/automatic (someone else's system, per
// the pre-existing customer_notifications type constraint) and don't make
// sense as a manual broadcast.
const CATEGORY_MAP = {
  harvestNews: { notificationType: 'harvest_available', prefKey: 'harvestNews' },
  promotions: { notificationType: 'promotion', prefKey: 'promotions' },
} as const;

const SendAnnouncementSchema = z.object({
  category: z.enum(['harvestNews', 'promotions']),
  title: z.string().min(1, 'Title is required.').max(120),
  message: z.string().min(1, 'Message is required.').max(1000),
});

export async function sendAnnouncement(
  _prev: SendAnnouncementState,
  formData: FormData
): Promise<SendAnnouncementState> {
  const admin = await requireAdmin();

  const parsed = SendAnnouncementSchema.safeParse({
    category: formData.get('category'),
    title: formData.get('title'),
    message: formData.get('message'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { category, title, message } = parsed.data;
  const { notificationType, prefKey } = CATEGORY_MAP[category];

  const supabase = await createClient();
  const { data: customers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, notification_prefs')
    .eq('role', 'customer')
    .eq('vendor_id', admin.vendor_id);

  if (fetchError) return { error: 'Failed to load customers.' };

  // A missing key (older accounts predating this preference, or the
  // column's own default before a value was ever explicitly saved) counts
  // as opted-in -- only an explicit `false` opts someone out.
  const recipients = (customers ?? []).filter((c) => {
    const prefs = c.notification_prefs as Record<string, boolean> | null;
    return prefs?.[prefKey] !== false;
  });

  if (recipients.length === 0) {
    return { error: 'No opted-in customers to notify.' };
  }

  const { error: insertError } = await supabase.from('customer_notifications').insert(
    recipients.map((r) => ({
      profile_id: r.id,
      type: notificationType,
      title,
      message,
    }))
  );
  if (insertError) return { error: `Failed to create notifications: ${insertError.message}` };

  await Promise.all(
    recipients
      .filter((r) => r.email)
      .map((r) => sendAnnouncementEmail({ to: r.email!, title, message, businessName: admin.vendor_name }))
  );

  await logAdminAction(admin, 'send_announcement', 'customer_notifications', null, {
    category,
    title,
    recipientCount: recipients.length,
  });

  return { success: true, recipientCount: recipients.length };
}
