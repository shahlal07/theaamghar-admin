import { notFound } from 'next/navigation';
import { getCategories, getProductDetail, getVendorCategorySchema } from '@/lib/queries/products';
import { ProductFormClient } from '../ProductFormClient';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, categorySchema] = await Promise.all([
    getProductDetail(id),
    getCategories(),
    getVendorCategorySchema(),
  ]);

  if (!product) notFound();

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
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">{product.name}</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">Edit product details, images, and stock.</p>
      <ProductFormClient product={product} categories={categories} categorySchema={categorySchema} />
    </div>
  );
}
