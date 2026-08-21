import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AdminRole = 'admin' | 'staff';
export type AdminUser = { id: string; email: string; name: string | null; role: AdminRole; vendor_id: string; vendor_name: string };

export const getAdminUser = cache(async (): Promise<AdminUser> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const authUser = claimsData?.claims;
  if (claimsError || !authUser) redirect('/login');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) redirect('/login/mfa');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, name, email, vendor_id')
    .eq('id', authUser.sub)
    .single();

  if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'staff') || !profile.vendor_id) {
    redirect('/login?error=not_admin');
  }

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id, name, active, status')
    .eq('id', profile.vendor_id)
    .eq('active', true)
    .eq('status', 'active')
    .single();

  if (vendorError || !vendor) redirect('/login?error=vendor_inactive');

  return {
    id: profile.id,
    email: profile.email ?? String(authUser.email ?? ''),
    name: profile.name,
    role: profile.role as AdminRole,
    vendor_id: vendor.id,
    vendor_name: vendor.name,
  };
});

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (admin.role !== 'admin') redirect('/admin');
  return admin;
}
