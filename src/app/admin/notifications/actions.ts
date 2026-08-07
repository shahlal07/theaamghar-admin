'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function markNotificationRead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await getAdminUser();

  const parsed = z.uuid().safeParse(formData.get('notificationId'));
  if (!parsed.success) return { error: 'Invalid notification id.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('id', parsed.data);

  if (error) return { error: `Failed to update: ${error.message}` };

  revalidatePath('/admin', 'layout');
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  await getAdminUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('read', false);

  if (error) return { error: `Failed to update: ${error.message}` };

  revalidatePath('/admin', 'layout');
  return { success: true };
}
