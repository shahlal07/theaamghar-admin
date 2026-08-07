import { getVarieties } from '@/lib/queries/varieties';
import { VarietiesClient } from './VarietiesClient';

export const dynamic = 'force-dynamic';

export default async function VarietiesPage() {
  const { varieties, gatewayFeePercent, defaultShippingCost } = await getVarieties();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Varieties &amp; Seasons</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Manage each variety&apos;s purchase price, harvest window, and per-box
        selling price / stock. Profit shown per row is a live preview using
        the default shipping cost and gateway fee from Settings.
      </p>
      <VarietiesClient
        varieties={varieties}
        gatewayFeePercent={gatewayFeePercent}
        defaultShippingCost={defaultShippingCost}
      />
    </div>
  );
}
