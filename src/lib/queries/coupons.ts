import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export async function getCoupons(): Promise<Coupon[]> {
  const supabase = await createClient();
  const admin = await getAdminUser();
  // Explicit filter, not just reliance on RLS -- the RLS policy on this
  // table (`admins manage coupons`) does correctly scope by vendor_id for a
  // regular admin, but querying with no filter at all previously also
  // silently returned universal (vendor_id null) coupons mixed in, which
  // aren't this vendor's to edit/delete. Scoping to this vendor's own rows
  // only, same as every other admin-facing list in this app.
  const { data, error } = await supabase
    .from('coupons')
    .select(
      'id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, active, starts_at, expires_at, created_at'
    )
    .eq('vendor_id', admin.vendor_id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load coupons: ${error.message}`);
  return data ?? [];
}
