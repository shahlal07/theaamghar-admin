import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { AdminUser } from '@/lib/dal';

/**
 * Records an admin write action to admin_audit_log. Call this from a Server
 * Action *after* the write succeeds, passing the already-fetched AdminUser
 * from getAdminUser() so this never triggers its own auth round trip.
 *
 * Failure to write the log entry is swallowed (logged to console, not
 * thrown) — an audit-log outage must never block the underlying admin
 * action from completing.
 */
export async function logAdminAction(
  actor: AdminUser,
  action: string,
  entityType: string,
  entityId?: string | null,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('admin_audit_log').insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      detail: detail ?? null,
    });
    if (error) {
      console.error('[audit-log] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[audit-log] unexpected error:', err);
  }
}
