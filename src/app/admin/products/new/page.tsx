import { getCategories, getVendorCategorySchema } from '@/lib/queries/products';
import { ProductFormClient } from '../ProductFormClient';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const [categories, categorySchema] = await Promise.all([getCategories(), getVendorCategorySchema()]);

  if (!categorySchema) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text)]">
        <h1 className="mb-2 text-xl font-bold">No category assigned yet</h1>
        <p className="text-[var(--text-light)]">
          Ask your platform admin to assign a product category to your store first — the product form
          needs it to know which fields to show.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">New Product</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Fill in the details below, then add at least one{' '}
        {categorySchema.model === 'weight_based' ? 'box size' : categorySchema.model === 'variant_based' ? 'variant' : 'price/stock entry'}{' '}
        so it can be sold.
      </p>
      <ProductFormClient product={null} categories={categories} categorySchema={categorySchema} />
    </div>
  );
}
