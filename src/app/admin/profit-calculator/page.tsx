import { getProfitCalculatorData } from '@/lib/queries/profit-calculator';
import { ProfitCalculatorClient } from './ProfitCalculatorClient';

export const dynamic = 'force-dynamic';

export default async function ProfitCalculatorPage() {
  const { products, settings, shippingZones } = await getProfitCalculatorData();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Profit Calculator</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Change any value to instantly recalculate cost, revenue, and margin.
      </p>
      <ProfitCalculatorClient
        products={products}
        settings={settings}
        shippingZones={shippingZones}
      />
    </div>
  );
}
