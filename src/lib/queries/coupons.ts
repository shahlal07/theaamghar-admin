import 'server-only';
import { createClient } from '@/lib/supabase/server';

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
  const { data, error } = await supabase
    .from('coupons')
    .select(
      'id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, active, starts_at, expires_at, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load coupons: ${error.message}`);
  return data ?? [];
}
