import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely and can call
 * `auth.admin.*` (change another user's email, trigger password resets,
 * etc). Only ever import this from Server Actions that have already called
 * getAdminUser(), and never expose either server-only key to the client.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'Supabase server admin credentials are not configured. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.'
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
