import type { createClient } from '@/lib/supabase/server';

type RateLimitOptions = {
  maxAttempts: number;
  windowMinutes: number;
  lockMinutes: number;
};

type RateLimitResult = { allowed: boolean; retryAfter: string | null };

// Generic wrapper around the check_and_record_rate_limit RPC (mirrors
// vendor-storefronts/src/lib/rate-limit.ts) -- parameterized version of the same
// row-lock/increment/lockout primitive check_and_record_login_attempt
// already uses. Fails closed on any RPC error.
export async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  identifier: string,
  { maxAttempts, windowMinutes, lockMinutes }: RateLimitOptions
): Promise<RateLimitResult> {
  // Matches the un-.single()'d indexing pattern check_and_record_login_attempt's
  // own call site (login/actions.ts) already uses -- this repo's Supabase
  // client has no generated Database type, so .single() resolves to an
  // unhelpfully-narrow {} here rather than the real row shape.
  const { data } = await supabase.rpc('check_and_record_rate_limit', {
    p_bucket: bucket,
    p_identifier: identifier,
    p_max_attempts: maxAttempts,
    p_window_minutes: windowMinutes,
    p_lock_minutes: lockMinutes,
  });
  const row = data?.[0];

  return { allowed: row?.allowed === true, retryAfter: row?.retry_after ?? null };
}
