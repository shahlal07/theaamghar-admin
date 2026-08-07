'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import {
  enrollMfaFactor,
  verifyMfaEnrollment,
  unenrollMfaFactor,
  type MfaFactor,
  type EnrollState,
} from './mfa-actions';

function EnrollFlow({ onDone }: { onDone: () => void }) {
  const [enrolling, startEnroll] = useTransition();
  const [enrollState, setEnrollState] = useState<EnrollState>(undefined);
  const [verifyState, verifyAction, verifying] = useActionState(verifyMfaEnrollment, undefined);

  useEffect(() => {
    if (verifyState?.success) {
      toast.success('Two-factor authentication enabled');
      onDone();
    }
    if (verifyState?.error) toast.error(verifyState.error);
  }, [verifyState, onDone]);

  if (!enrollState) {
    return (
      <button
        type="button"
        disabled={enrolling}
        onClick={() => startEnroll(async () => setEnrollState(await enrollMfaFactor()))}
        className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enrolling ? 'Starting…' : 'Enable two-factor authentication'}
      </button>
    );
  }

  if ('error' in enrollState) {
    return <p className="text-sm text-red-600 dark:text-red-400">{enrollState.error}</p>;
  }

  return (
    <form action={verifyAction} className="space-y-3">
      <input type="hidden" name="factorId" value={enrollState.factorId} />
      <p className="text-sm text-[var(--text-light)]">
        Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password),
        then enter the 6-digit code it shows.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns an inline SVG data URI, not an optimizable remote image */}
      <img
        src={enrollState.qrCode}
        alt="Scan with your authenticator app"
        className="h-40 w-40 rounded-lg border border-[var(--border-subtle)] bg-white p-2"
      />
      <p className="text-xs text-[var(--text-light)]">
        Can&apos;t scan?{' '}
        <span className="font-mono text-[var(--text)]">{enrollState.secret}</span>
      </p>
      <div className="flex items-center gap-2">
        <input
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="000000"
          className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-center text-sm tracking-widest text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
        <button
          type="submit"
          disabled={verifying}
          className="rounded-lg bg-[var(--orchard-green)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orchard-light)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {verifying ? 'Verifying…' : 'Confirm'}
        </button>
      </div>
    </form>
  );
}

function FactorRow({ factor, onRemoved }: { factor: MfaFactor; onRemoved: () => void }) {
  const [state, formAction, pending] = useActionState(unenrollMfaFactor, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success('Two-factor authentication removed');
      onRemoved();
    }
    if (state?.error) toast.error(state.error);
  }, [state, onRemoved]);

  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">Authenticator app</p>
        <p className="text-xs text-[var(--text-light)]">
          Added {new Date(factor.createdAt).toLocaleDateString()}
        </p>
      </div>
      <form action={formAction}>
        <input type="hidden" name="factorId" value={factor.id} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {pending ? 'Removing…' : 'Remove'}
        </button>
      </form>
    </div>
  );
}

export function MfaClient({ initialFactors }: { initialFactors: MfaFactor[] }) {
  const [factors, setFactors] = useState(initialFactors);
  const [showEnroll, setShowEnroll] = useState(false);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Two-Factor Authentication</h2>
      <p className="mb-4 text-sm text-[var(--text-light)]">
        Require a code from an authenticator app in addition to your password when signing in.
      </p>

      {factors.length > 0 ? (
        <div className="space-y-2">
          {factors.map((f) => (
            <FactorRow
              key={f.id}
              factor={f}
              onRemoved={() => setFactors((prev) => prev.filter((x) => x.id !== f.id))}
            />
          ))}
        </div>
      ) : showEnroll ? (
        <EnrollFlow
          onDone={() => {
            setShowEnroll(false);
            // Re-fetch happens on next settings page load; optimistic
            // placeholder row keeps the "already enrolled" state visible now.
            setFactors([{ id: 'pending', friendlyName: null, createdAt: new Date().toISOString() }]);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowEnroll(true)}
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)]"
        >
          Enable two-factor authentication
        </button>
      )}
    </div>
  );
}
