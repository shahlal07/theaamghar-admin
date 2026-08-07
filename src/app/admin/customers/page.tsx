import { getCustomersList } from '@/lib/queries/customers';
import { CustomersListClient } from './CustomersListClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customers = await getCustomersList();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Customers</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Lifetime spend, order history, and returning-customer tracking.
      </p>
      <CustomersListClient customers={customers} />
    </div>
  );
}
