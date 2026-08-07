import { getCategories } from '@/lib/queries/products';
import { ProductFormClient } from '../ProductFormClient';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">New Product</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Fill in the details below, then add at least one box size so it can be sold.
      </p>
      <ProductFormClient product={null} categories={categories} />
    </div>
  );
}
