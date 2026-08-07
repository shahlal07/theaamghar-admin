import 'server-only';
import { createClient } from '@/lib/supabase/server';

export const AUDIT_LOG_PAGE_SIZE = 40;

export type AuditLogEntry = {
  id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLogPage = {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
};

/**
 * Reads the admin action audit trail, newest first, paginated. RLS on
 * admin_audit_log already restricts SELECT to admins (private.is_admin()),
 * so this is safe to call from any admin-guarded page.
 *
 * entityType/action are optional exact-match filters (the distinct values
 * come from getAuditLogFilterValues below so the UI can offer real options
 * rather than a free-text box).
 */
export async function getAuditLog(
  page = 1,
  entityType?: string,
  action?: string
): Promise<AuditLogPage> {
  const supabase = await createClient();
  const from = (page - 1) * AUDIT_LOG_PAGE_SIZE;
  const to = from + AUDIT_LOG_PAGE_SIZE - 1;

  let query = supabase
    .from('admin_audit_log')
    .select('id, actor_email, action, entity_type, entity_id, detail, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (entityType && entityType !== 'all') query = query.eq('entity_type', entityType);
  if (action && action !== 'all') query = query.eq('action', action);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load audit log: ${error.message}`);

  return {
    entries: (data ?? []) as AuditLogEntry[],
    totalCount: count ?? 0,
    page,
    pageSize: AUDIT_LOG_PAGE_SIZE,
  };
}

/**
 * Distinct entity_type and action values currently present in the log, so
 * the filter dropdowns only show options that actually exist. Cheap enough
 * at this volume (single-vendor admin activity) to compute by scanning the
 * columns rather than maintaining a separate lookup.
 */
export async function getAuditLogFilterValues(): Promise<{
  entityTypes: string[];
  actions: string[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('entity_type, action')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw new Error(`Failed to load audit filters: ${error.message}`);

  const entityTypes = [...new Set((data ?? []).map((r) => r.entity_type))].sort();
  const actions = [...new Set((data ?? []).map((r) => r.action))].sort();
  return { entityTypes, actions };
}
