import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = 'https://eznxsosvsgkhexbjoolh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iJsDi91W3kwMsfdYP7AJBA_FiIOIWvI';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
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
  });
}
