'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatPKR } from '@/lib/format';
import type { CustomerDetail } from '@/lib/queries/customers';
import { updateCustomerProfile, updateCustomerEmail, sendPasswordResetEmail } from './actions';

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-[var(--surface-sunken)] text-[var(--text-light)]',
  confirmed: 'bg-[var(--golden)]/25 text-[#8a6d00]',
  packed: 'bg-[#c9d9ff] text-[#1e3a8a]',
  shipped: 'bg-[#c9d9ff] text-[#1e3a8a]',
  delivered: 'bg-[var(--orchard-green)]/15 text-[var(--orchard-green)]',
  cancelled: 'bg-[var(--error)]/15 text-[var(--error)]',
  refunded: 'bg-[var(--error)]/15 text-[var(--error)]',
};

export function CustomerDetailClient({ customer }: { customer: CustomerDetail }) {
  const [name, setName] = useState(customer.name ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [state, formAction, pending] = useActionState(updateCustomerProfile, undefined);

  const [email, setEmail] = useState(customer.email ?? '');
  const [emailState, emailAction, emailPending] = useActionState(updateCustomerEmail, undefined);
  const [resetState, resetAction, resetPending] = useActionState(
    sendPasswordResetEmail,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success('Profile saved');
    if (state?.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (emailState?.success) toast.success('Email updated');
    if (emailState?.error) toast.error(emailState.error);
  }, [emailState]);

  useEffect(() => {
    if (resetState?.success) toast.success('Password reset email sent');
    if (resetState?.error) toast.error(resetState.error);
  }, [resetState]);

  const totalSpent = customer.orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--text-light)]">Orders</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{customer.orders.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--text-light)]">
            Lifetime Spend
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">{formatPKR(totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--text-light)]">
            Favourite Variety
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {customer.favourite_variety ?? '—'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Profile</h2>
        <form
          action={(fd) => {
            fd.set('customerId', customer.id);
            fd.set('name', name);
            fd.set('phone', phone);
            formAction(fd);
          }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Account Access</h2>
        <p className="mb-4 text-xs text-[var(--text-light)]">
          Use this if the customer is locked out or needs their login email corrected.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <form
            action={(fd) => {
              fd.set('customerId', customer.id);
              fd.set('email', email);
              emailAction(fd);
            }}
            className="sm:col-span-2"
          >
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
              Login Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
              />
              <button
                type="submit"
                disabled={emailPending || email === (customer.email ?? '')}
                className="whitespace-nowrap rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailPending ? 'Saving…' : 'Change Email'}
              </button>
            </div>
          </form>

          <form
            action={(fd) => {
              fd.set('email', customer.email ?? '');
              resetAction(fd);
            }}
            className="flex flex-col justify-end"
          >
            <button
              type="submit"
              disabled={resetPending || !customer.email}
              className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetPending ? 'Sending…' : 'Send Password Reset Email'}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Order History</h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-[var(--text-light)]">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {customer.orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">{o.order_number}</p>
                  <p className="text-xs text-[var(--text-light)]">
                    {new Date(o.created_at).toLocaleDateString('en-PK')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status] ?? ''}`}
                >
                  {o.status}
                </span>
                <p className="text-[var(--text)]">{formatPKR(o.total)}</p>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
