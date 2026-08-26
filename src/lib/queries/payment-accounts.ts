import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import type { PaymentAccount } from '@/lib/payment-methods';

export {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PaymentAccount,
} from '@/lib/payment-methods';

// The RLS SELECT policy's `active = true` clause is intentionally
// vendor-agnostic (it's what lets a storefront visitor read any vendor's
// own active accounts via a query that itself filters by vendor_id) -- it
// does NOT scope active rows to the caller's vendor. Without the explicit
// .eq('vendor_id', ...) below, this admin-side query silently returned
// every OTHER vendor's active payment accounts too (real bug, found via a
// live cross-vendor audit: TheAamGhar's Easypaisa account number was
// visible on Mina Cafe's Settings page). Admins still see their own
// inactive rows here (the is_admin()-plus-vendor-match clause), just not
// other vendors' of either state.
export async function getPaymentAccounts(): Promise<PaymentAccount[]> {
  const admin = await getAdminUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payment_accounts')
    .select(
      'id, method, label, account_title, account_number, bank_name, iban, instructions, active, sort_order'
    )
    .eq('vendor_id', admin.vendor_id)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to load payment accounts: ${error.message}`);
  return (data ?? []) as PaymentAccount[];
}
