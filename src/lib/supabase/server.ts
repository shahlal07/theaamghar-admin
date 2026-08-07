import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Creates a fresh Supabase server client per request. Do not cache this in a
// module-level variable — with Fluid compute the same instance can leak
// across requests from different users.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore since the
            // proxy is responsible for refreshing the session cookie.
          }
        },
      },
    }
  );
}
