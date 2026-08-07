import Link from 'next/link';
import { getProductsList } from '@/lib/queries/products';
import { ProductsListClient } from './ProductsListClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await getProductsList();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Products</h1>
          <p className="text-sm text-[var(--text-light)]">
            Manage the catalog — images, pricing, costs, and box sizes.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)]"
        >
          + New Product
        </Link>
      </div>
      <ProductsListClient products={products} />
    </div>
  );
}
