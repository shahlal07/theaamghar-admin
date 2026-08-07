import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely and can call
 * `auth.admin.*` (change another user's email, trigger password resets,
 * etc). Only ever import this from Server Actions that have already called
 * getAdminUser(), and never expose SUPABASE_SERVICE_ROLE_KEY to the client
 * (no NEXT_PUBLIC_ prefix, never returned from an API response).
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local — get it from Supabase Dashboard → Project Settings → API → service_role secret key.'
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
