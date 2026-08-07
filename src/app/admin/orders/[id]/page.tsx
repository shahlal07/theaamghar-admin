import { notFound } from 'next/navigation';
import { getOrderDetail } from '@/lib/queries/orders';
import { OrderDetailClient } from '../OrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) notFound();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Order {order.order_number}</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Placed {new Date(order.created_at).toLocaleString('en-PK')}
      </p>
      <OrderDetailClient order={order} />
    </div>
  );
}
