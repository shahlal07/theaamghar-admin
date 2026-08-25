import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isIpAllowlisted } from '@/lib/ip-allowlist';

const SUPABASE_URL = 'https://eznxsosvsgkhexbjoolh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iJsDi91W3kwMsfdYP7AJBA_FiIOIWvI';
const PUBLIC_PATHS = ['/login'];

// Optimistic auth check only: confirms a signed-in session exists and
// refreshes the token. It intentionally does NOT check profiles.role (that
// would mean a database round trip on every request). The real
// admin-role authorization happens in src/lib/dal.ts's getAdminUser(),
// called from the protected /admin layout, and is enforced again at the
// database layer by Postgres RLS (private.is_admin()) — this proxy is
// only the first, cheap line of defense.
export async function updateSession(request: NextRequest) {
  if (!isIpAllowlisted(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Only auto-redirect a signed-in user away from /login when they landed
  // there with no error -- any error param (not_admin, vendor_inactive, ...)
  // means dal.ts's getAdminUser() deliberately sent them back here to show
  // that specific message, and bouncing them to /admin just re-triggers the
  // same failing check there, landing on a blank page instead of the error.
  if (
    user &&
    request.nextUrl.pathname === '/login' &&
    !request.nextUrl.searchParams.get('error')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
