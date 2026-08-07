import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AdminRole = 'admin' | 'staff';

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
};

/**
 * Confirms there's an authenticated Supabase session AND that the
 * corresponding profiles row has role = 'admin' or 'staff'. Redirects to
 * /login otherwise. Memoized per-request with React's cache() so calling
 * this from a layout and again from a page doesn't cost two round trips.
 *
 * This is the real authorization boundary — the proxy only does an
 * optimistic "is anyone logged in" check. Postgres RLS
 * (private.is_staff_or_admin() / private.is_admin()) is the last line of
 * defense if this is ever bypassed.
 *
 * Staff and admin share this same gate since most of the panel (orders,
 * inventory, products, reviews) is operational and fine for staff to touch.
 * Call requireAdmin() instead, from inside a specific page or Server
 * Action, for the admin-only surfaces (settings, coupons, audit log, staff
 * management, customer email/password changes).
 */
export const getAdminUser = cache(async (): Promise<AdminUser> => {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const authUser = claimsData?.claims;

  if (claimsError || !authUser) {
    redirect('/login');
  }

  // If this account has a verified TOTP factor, the session must have
  // actually cleared the MFA challenge (aal2) to reach /admin — not just
  // have a valid password-only (aal1) cookie. Catches sessions that were
  // started before MFA was enrolled, or any path that skipped /login/mfa.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
    redirect('/login/mfa');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, name, email')
    .eq('id', authUser.sub)
    .single();

  if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
    redirect('/login?error=not_admin');
  }

  return {
    id: profile.id,
    email: profile.email ?? String(authUser.email ?? ''),
    name: profile.name,
    role: profile.role as AdminRole,
  };
});

/**
 * Stricter gate for admin-only surfaces. Staff pass getAdminUser() but get
 * bounced here — to /admin (not /login), since they do have legitimate
 * panel access, just not to this particular page/action.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (admin.role !== 'admin') {
    redirect('/admin');
  }
  return admin;
}
