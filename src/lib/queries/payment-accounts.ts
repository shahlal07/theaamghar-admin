import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { PaymentAccount } from '@/lib/payment-methods';

export {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PaymentAccount,
} from '@/lib/payment-methods';

// Admins see every row (active or not) -- the RLS SELECT policy is
// `active = true or private.is_admin()`, so inactive accounts being edited
// stay visible here while staying hidden from the storefront.
export async function getPaymentAccounts(): Promise<PaymentAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payment_accounts')
    .select(
      'id, method, label, account_title, account_number, bank_name, iban, instructions, active, sort_order'
    )
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to load payment accounts: ${error.message}`);
  return (data ?? []) as PaymentAccount[];
}
