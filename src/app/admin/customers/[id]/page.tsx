import { notFound } from 'next/navigation';
import { getCustomerDetail } from '@/lib/queries/customers';
import { CustomerDetailClient } from '../CustomerDetailClient';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) notFound();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">{customer.name ?? 'Unnamed Customer'}</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Customer since {new Date(customer.created_at).toLocaleDateString('en-PK')}
      </p>
      <CustomerDetailClient customer={customer} />
    </div>
  );
}
