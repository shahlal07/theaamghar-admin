'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import type { OrderDetail } from '@/lib/queries/orders';
import { verifyPayment, getPaymentProofUrl } from './actions';

const METHOD_LABELS: Record<string, string> = {
  bank: 'Bank Transfer',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
};

const MANUAL_METHODS = ['bank', 'easypaisa', 'jazzcash'];

export function PaymentVerification({ order }: { order: OrderDetail }) {
  // Keyed by the path it was fetched for, so "still loading" and "loaded"
  // are derived below rather than tracked as a separate flag that would
  // need a synchronous setState at the top of the effect.
  const [proof, setProof] = useState<{ path: string; url: string | null } | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [state, formAction, pending] = useActionState(verifyPayment, undefined);

  const path = order.payment_proof_url;

  // The bucket is private, so the <img> needs a freshly-minted signed URL
  // rather than a stored public one.
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    getPaymentProofUrl(path).then((url) => {
      if (!cancelled) setProof({ path, url });
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const proofUrl = proof?.path === path ? proof.url : null;
  const proofLoading = Boolean(path) && proof?.path !== path;

  useEffect(() => {
    if (state?.success) {
      toast.success('Payment updated');
      // Same "reset form UI after a useActionState submission" exception
      // documented across this app -- useActionState exposes no completion
      // callback, so watching its result in an effect is the only hook.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRejecting(false);
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!MANUAL_METHODS.includes(order.payment_method ?? '')) return null;

  const isPdf = path?.toLowerCase().endsWith('.pdf');
  const status = order.payment_status;

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--text)]">
          Payment Verification
          <span className="ml-2 text-sm font-normal text-[var(--text-light)]">
            {METHOD_LABELS[order.payment_method ?? ''] ?? order.payment_method} ·{' '}
            {formatPKR(order.total)}
          </span>
        </h2>
        <StatusPill status={status} />
      </div>

      {!path ? (
        <p className="rounded-lg bg-[var(--surface-sunken)] p-4 text-sm text-[var(--text-light)]">
          The customer hasn&apos;t uploaded a payment proof yet.
        </p>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-[var(--border-subtle)] p-3">
            {proofLoading ? (
              <p className="py-8 text-center text-sm text-[var(--text-light)]">Loading proof…</p>
            ) : !proofUrl ? (
              <p className="py-8 text-center text-sm text-[var(--text-light)]">
                Couldn&apos;t load the proof file.
              </p>
            ) : isPdf ? (
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-8 text-center text-sm font-semibold text-[var(--mango-orange)] underline"
              >
                Open PDF receipt →
              </a>
            ) : (
              <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofUrl}
                  alt="Customer payment proof"
                  className="mx-auto max-h-[420px] w-auto rounded-lg"
                />
                <span className="mt-2 block text-center text-xs text-[var(--text-light)]">
                  Click to open full size
                </span>
              </a>
            )}
          </div>

          {order.payment_proof_uploaded_at && (
            <p className="mb-4 text-xs text-[var(--text-light)]">
              Uploaded {new Date(order.payment_proof_uploaded_at).toLocaleString('en-PK')}
              {order.payment_verified_at &&
                ` · Verified ${new Date(order.payment_verified_at).toLocaleString('en-PK')}`}
            </p>
          )}

          {status === 'rejected' && order.payment_rejection_reason && (
            <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <strong>Rejected:</strong> {order.payment_rejection_reason}
              <span className="mt-1 block text-xs opacity-80">
                The customer sees this on their tracking page, with a WhatsApp link to reach you.
              </span>
            </p>
          )}

          {rejecting ? (
            <form
              action={(fd) => {
                fd.set('orderId', order.id);
                fd.set('approve', 'false');
                fd.set('rejectionReason', rejectionReason);
                formAction(fd);
              }}
            >
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
                What was wrong? (the customer sees this)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                placeholder="e.g. The amount transferred was Rs 500 short of the order total."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={pending || !rejectionReason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? 'Saving…' : 'Confirm rejection'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <form
                action={(fd) => {
                  fd.set('orderId', order.id);
                  fd.set('approve', 'true');
                  formAction(fd);
                }}
              >
                <button
                  type="submit"
                  disabled={pending || status === 'paid'}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {status === 'paid' ? '✓ Payment approved' : pending ? 'Saving…' : 'Approve payment'}
                </button>
              </form>
              {status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10"
                >
                  Reject — ask customer to contact us
                </button>
              )}
            </div>
          )}

          {status !== 'paid' && (
            <p className="mt-3 text-xs text-[var(--text-light)]">
              Approving marks the payment paid and moves a still-pending order to{' '}
              <strong>confirmed</strong>.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Awaiting payment',
      className: 'bg-[var(--surface-sunken)] text-[var(--text-light)]',
    },
    submitted: {
      label: 'Needs verification',
      className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    paid: { label: 'Verified', className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  };
  const meta = map[status ?? 'pending'] ?? map.pending;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}
