'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatPKR } from '@/lib/format';
import type { CustomerListItem } from '@/lib/queries/customers';

export function CustomersListClient({ customers }: { customers: CustomerListItem[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or phone…"
        className="mb-4 w-full max-w-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] sm:w-80"
      />

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-light)] shadow-sm">
          {customers.length === 0
            ? 'No customers yet — accounts created via storefront sign-up will show up here.'
            : 'No customers match your search.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wide text-[var(--text-light)]">
                <th className="py-3 pl-5 pr-4">Customer</th>
                <th className="py-3 pr-4">Contact</th>
                <th className="py-3 pr-4">Orders</th>
                <th className="py-3 pr-4">Lifetime Spend</th>
                <th className="py-3 pr-4">Last Order</th>
                <th className="py-3 pr-4">Joined</th>
                <th className="py-3 pr-5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                  <td className="py-3 pl-5 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--text)]">{c.name ?? 'Unnamed'}</p>
                      {c.order_count > 1 && (
                        <span className="rounded-full bg-[var(--orchard-green)]/15 px-2 py-0.5 text-xs font-medium text-[var(--orchard-green)]">
                          Returning
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-light)]">
                    <div>{c.email ?? '—'}</div>
                    <div className="text-xs">{c.phone ?? '—'}</div>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text)]">{c.order_count}</td>
                  <td className="py-3 pr-4 text-[var(--text)]">{formatPKR(c.total_spent)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-[var(--text-light)]">
                    {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-[var(--text-light)]">
                    {new Date(c.created_at).toLocaleDateString('en-PK')}
                  </td>
                  <td className="py-3 pr-5">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="rounded-lg bg-[var(--mango-orange)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--mango-deep)]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
