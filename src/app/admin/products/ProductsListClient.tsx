'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductListItem } from '@/lib/queries/products';
import { setProductStatus } from './actions';

const STATUS_CLASS: Record<string, string> = {
  published: 'bg-[var(--orchard-green)]/15 text-[var(--orchard-green)]',
  draft: 'bg-[var(--surface-sunken)] text-[var(--text-light)]',
  archived: 'bg-[var(--error)]/15 text-[var(--error)]',
};

function StatusButton({ productId, status }: { productId: string; status: string }) {
  const [state, formAction, pending] = useActionState(setProductStatus, undefined);

  useEffect(() => {
    if (state?.success) toast.success('Status updated');
    if (state?.error) toast.error(state.error);
  }, [state]);

  const next =
    status === 'published' ? 'archived' : status === 'draft' ? 'published' : 'draft';
  const label =
    status === 'published' ? 'Archive' : status === 'draft' ? 'Publish' : 'Restore to draft';

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? '…' : label}
      </button>
    </form>
  );
}

export function ProductsListClient({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-[var(--text-light)]">
        No products yet — create your first one.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wide text-[var(--text-light)]">
            <th className="py-3 pl-5 pr-4">Product</th>
            <th className="py-3 pr-4">Category</th>
            <th className="py-3 pr-4">Price</th>
            <th className="py-3 pr-4">Box Sizes</th>
            <th className="py-3 pr-4">Stock</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
              <td className="py-3 pl-5 pr-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--surface-sunken)]">
                    {p.image && (
                      <Image src={p.image} alt="" fill sizes="40px" className="object-cover" unoptimized />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text)]">{p.name}</p>
                    <p className="text-xs text-[var(--text-light)]">/{p.slug}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4 text-[var(--text-light)]">{p.category_name ?? '—'}</td>
              <td className="py-3 pr-4 text-[var(--text)]">
                {p.price !== null ? `Rs ${p.price.toLocaleString('en-PK')}` : '—'}
              </td>
              <td className="py-3 pr-4 text-[var(--text-light)]">{p.box_size_count}</td>
              <td className="py-3 pr-4 text-[var(--text-light)]">{p.total_stock}</td>
              <td className="py-3 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status] ?? ''}`}
                >
                  {p.status}
                </span>
              </td>
              <td className="py-3 pr-5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="rounded-lg bg-[var(--mango-orange)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--mango-deep)]"
                  >
                    Edit
                  </Link>
                  <StatusButton productId={p.id} status={p.status} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
