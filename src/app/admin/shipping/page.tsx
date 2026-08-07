import { getShippingZones } from '@/lib/queries/shipping';
import { requireAdmin } from '@/lib/dal';
import { ShippingClient } from './ShippingClient';

export const dynamic = 'force-dynamic';

export default async function ShippingPage() {
  await requireAdmin();
  const zones = await getShippingZones();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Shipping</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Set delivery rates per province, with optional per-city overrides.
      </p>
      <ShippingClient zones={zones} />
    </div>
  );
}
