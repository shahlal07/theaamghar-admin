'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentAccount,
  type PaymentMethod,
} from '@/lib/payment-methods';
import { savePaymentAccount, deletePaymentAccount } from './payment-actions';

const inputClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
        {label}
      </label>
      {children}
    </div>
  );
}

export function PaymentAccountsClient({ accounts }: { accounts: PaymentAccount[] }) {
  const [editing, setEditing] = useState<PaymentAccount | 'new' | null>(null);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">Payment Accounts</h2>
          <p className="mt-1 text-sm text-[var(--text-light)]">
            Bank / Easypaisa / JazzCash details customers see at checkout. They transfer manually
            and upload proof — you verify it on the order.
          </p>
        </div>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            + Add account
          </button>
        )}
      </div>

      <p className="mb-4 rounded-lg bg-[var(--surface-sunken)] p-3 text-xs text-[var(--text-light)]">
        <strong className="text-[var(--text)]">Inactive accounts are hidden from customers.</strong>{' '}
        Keep an account inactive until its real details are filled in — an active account with
        placeholder digits would have customers transferring money into the void.
      </p>

      {editing !== null ? (
        <AccountForm
          account={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : accounts.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-light)]">
          No payment accounts yet — customers only see Cash on Delivery.
        </p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text)]">{account.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                      account.active
                        ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                        : 'bg-[var(--surface-sunken)] text-[var(--text-light)]'
                    }`}
                  >
                    {account.active ? 'Visible to customers' : 'Hidden'}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {PAYMENT_METHOD_LABELS[account.method]} · {account.account_title} ·{' '}
                  <span className="tabular-nums">{account.account_number}</span>
                  {account.bank_name ? ` · ${account.bank_name}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(account)}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account: PaymentAccount | null;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(account?.method ?? 'bank');
  const [label, setLabel] = useState(account?.label ?? '');
  const [accountTitle, setAccountTitle] = useState(account?.account_title ?? '');
  const [accountNumber, setAccountNumber] = useState(account?.account_number ?? '');
  const [bankName, setBankName] = useState(account?.bank_name ?? '');
  const [iban, setIban] = useState(account?.iban ?? '');
  const [instructions, setInstructions] = useState(account?.instructions ?? '');
  const [active, setActive] = useState(account?.active ?? false);
  const [sortOrder, setSortOrder] = useState(account?.sort_order ?? 0);

  const [state, formAction, pending] = useActionState(savePaymentAccount, undefined);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePaymentAccount,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success('Payment account saved');
      onDone();
    }
    if (state?.error) toast.error(state.error);
    // onDone is a stable closure from the parent's render; re-running this on
    // its identity would fire the toast twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Payment account deleted');
      onDone();
    }
    if (deleteState?.error) toast.error(deleteState.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  return (
    <form
      action={(fd) => {
        fd.set('id', account?.id ?? '');
        fd.set('method', method);
        fd.set('label', label);
        fd.set('accountTitle', accountTitle);
        fd.set('accountNumber', accountNumber);
        fd.set('bankName', bankName);
        fd.set('iban', iban);
        fd.set('instructions', instructions);
        fd.set('active', String(active));
        fd.set('sortOrder', String(sortOrder));
        formAction(fd);
      }}
      className="rounded-xl border border-[var(--border-subtle)] p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={inputClass}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Label shown to customer">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Meezan Bank — Main"
            className={inputClass}
          />
        </Field>
        <Field label="Account title">
          <input
            value={accountTitle}
            onChange={(e) => setAccountTitle(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={method === 'bank' ? 'Account number' : 'Mobile wallet number'}>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={inputClass}
          />
        </Field>
        {method === 'bank' && (
          <>
            <Field label="Bank name">
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="IBAN (optional)">
              <input value={iban} onChange={(e) => setIban(e.target.value)} className={inputClass} />
            </Field>
          </>
        )}
        <Field label="Display order">
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Instructions to customer (optional)">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg bg-[var(--surface-sunken)] p-3">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm text-[var(--text)]">
          Show this account to customers at checkout
          <span className="block text-xs text-[var(--text-light)]">
            Only tick this once the details above are real and correct.
          </span>
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save account'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
        >
          Cancel
        </button>
        {account && (
          <button
            type="button"
            disabled={deletePending}
            onClick={() => {
              const fd = new FormData();
              fd.set('id', account.id);
              deleteAction(fd);
            }}
            className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            {deletePending ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  );
}
