import { getCoupons } from '@/lib/queries/coupons';
import { requireAdmin } from '@/lib/dal';
import { CouponsClient } from './CouponsClient';

export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  await requireAdmin();
  const coupons = await getCoupons();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Coupons</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Percentage, fixed-amount, or free-shipping discounts with usage limits and expiry.
      </p>
      <CouponsClient coupons={coupons} />
    </div>
  );
}
