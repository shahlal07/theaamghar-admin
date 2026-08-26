import { getInventoryData } from '@/lib/queries/inventory';
import { InventoryClient } from './InventoryClient';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const { units, auditLog, sizeBreakdown } = await getInventoryData();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Inventory</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Stock is decremented automatically when an order is placed and
        restored automatically if it&apos;s cancelled or refunded. Use manual
        adjustments for restocks, damage, or corrections.
      </p>
      <InventoryClient units={units} auditLog={auditLog} sizeBreakdown={sizeBreakdown} />
    </div>
  );
}
