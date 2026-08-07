import { notFound } from 'next/navigation';
import { getCategories, getProductDetail } from '@/lib/queries/products';
import { ProductFormClient } from '../ProductFormClient';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductDetail(id), getCategories()]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">{product.name}</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">Edit product details, images, and box sizes.</p>
      <ProductFormClient product={product} categories={categories} />
    </div>
  );
}
