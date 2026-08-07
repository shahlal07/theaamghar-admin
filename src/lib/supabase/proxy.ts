import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isIpAllowlisted } from '@/lib/ip-allowlist';

const PUBLIC_PATHS = ['/login'];

// Optimistic auth check only: confirms a signed-in session exists and
// refreshes the token. It intentionally does NOT check profiles.role (that
// would mean a database round trip on every request). The real
// admin-role authorization happens in src/lib/dal.ts's getAdminUser(),
// called from the protected /admin layout, and is enforced again at the
// database layer by Postgres RLS (private.is_admin()) — this proxy is
// only the first, cheap line of defense.
export async function updateSession(request: NextRequest) {
  // Checked before any Supabase call, and before the public/login exemption
  // below -- when enabled, this blocks the login page itself too, not just
  // /admin, since the point is keeping the whole admin surface off the
  // public internet for anyone outside the allowlist. No-op unless
  // ADMIN_IP_ALLOWLIST is set.
  if (!isIpAllowlisted(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // Do not run other code between createServerClient and getClaims() —
  // a stray call in between can make session-refresh bugs very hard to
  // track down (users randomly signed out).
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

  // Don't bounce back to /admin when the session belongs to a non-admin
  // user who was just rejected there (getAdminUser() sent them here with
  // ?error=not_admin) — without this check, an authenticated-but-not-admin
  // session infinite-loops between /login and /admin forever, since this
  // proxy only knows "is anyone logged in", not "are they an admin".
  if (
    user &&
    request.nextUrl.pathname === '/login' &&
    request.nextUrl.searchParams.get('error') !== 'not_admin'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
