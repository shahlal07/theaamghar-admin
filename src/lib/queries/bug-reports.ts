import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type BugReport = {
  id: string;
  title: string;
  description: string;
  status: string;
  ai_reply: string | null;
  admin_note: string | null;
  reward_granted: boolean;
  screenshot_path: string | null;
  created_at: string;
  reviewed_at: string | null;
  reporter_name: string;
  reporter_email: string | null;
};

// Flat query + JS join rather than a `profiles(...)` embed -- bug_reports
// has two FKs into profiles (profile_id, reviewed_by), which makes a plain
// embed ambiguous to PostgREST. Same pattern already used in reviews.ts for
// the same reason.
export async function getBugReports(statusFilter?: string): Promise<BugReport[]> {
  const supabase = await createClient();

  let query = supabase
    .from('bug_reports')
    .select(
      'id, profile_id, title, description, status, ai_reply, admin_note, reward_granted, screenshot_path, created_at, reviewed_at'
    )
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: reports, error } = await query;
  if (error) throw new Error(`Failed to load bug reports: ${error.message}`);
  if (!reports || reports.length === 0) return [];

  const profileIds = [...new Set(reports.map((r) => r.profile_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', profileIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return reports.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    ai_reply: r.ai_reply,
    admin_note: r.admin_note,
    reward_granted: r.reward_granted,
    screenshot_path: r.screenshot_path,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
    reporter_name: profileById.get(r.profile_id)?.name ?? 'Unknown customer',
    reporter_email: profileById.get(r.profile_id)?.email ?? null,
  }));
}
