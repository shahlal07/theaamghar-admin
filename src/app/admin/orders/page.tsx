import { getOrdersList } from '@/lib/queries/orders';
import { OrdersListClient } from './OrdersListClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
  const { orders, totalCount, pageSize } = await getOrdersList(status, page);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Orders</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Track and update orders through the fulfillment pipeline.
      </p>
      <OrdersListClient
        orders={orders}
        statusFilter={status ?? 'all'}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
      />
    </div>
  );
}
