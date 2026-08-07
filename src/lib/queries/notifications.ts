import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export async function getRecentNotifications(limit = 20): Promise<AdminNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('id, type, title, message, link, read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return data ?? [];
}
