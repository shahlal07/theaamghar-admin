'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { updateOwnEmail, updateOwnPassword, type ActionState } from './account-actions';

const inputClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]';

export function AccountSecurityClient({ currentEmail }: { currentEmail: string }) {
  const [emailState, emailAction, emailPending] = useActionState<ActionState, FormData>(
    updateOwnEmail,
    undefined
  );
  const [passwordState, passwordAction, passwordPending] = useActionState<ActionState, FormData>(
    updateOwnPassword,
    undefined
  );
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (emailState?.success) toast.success(emailState.success);
    if (emailState?.error) toast.error(emailState.error);
  }, [emailState]);

  useEffect(() => {
    if (passwordState?.success) {
      toast.success(passwordState.success);
      // Same "clear form after a successful useActionState submission"
      // exception used throughout this app (see MfaClient/PaymentVerification)
      // -- useActionState has no completion callback, so watching the result
      // via effect is the only hook available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    if (passwordState?.error) toast.error(passwordState.error);
  }, [passwordState]);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Your Login</h2>
      <p className="mb-4 text-sm text-[var(--text-light)]">
        Change the email or password you sign in to this admin panel with.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <form action={emailAction} className="space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
            Login Email
          </label>
          <p className="text-xs text-[var(--text-light)]">Currently: {currentEmail}</p>
          <input
            name="email"
            type="email"
            required
            placeholder="new-email@example.com"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={emailPending}
            className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {emailPending ? 'Sending…' : 'Update Email'}
          </button>
        </form>

        <form action={passwordAction} className="space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
            Password
          </label>
          <input
            name="currentPassword"
            type="password"
            required
            placeholder="Current password"
            value={passwordFields.currentPassword}
            onChange={(e) => setPasswordFields((f) => ({ ...f, currentPassword: e.target.value }))}
            className={inputClass}
          />
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            placeholder="New password (min 8 characters)"
            value={passwordFields.newPassword}
            onChange={(e) => setPasswordFields((f) => ({ ...f, newPassword: e.target.value }))}
            className={inputClass}
          />
          <input
            name="confirmPassword"
            type="password"
            required
            placeholder="Confirm new password"
            value={passwordFields.confirmPassword}
            onChange={(e) => setPasswordFields((f) => ({ ...f, confirmPassword: e.target.value }))}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={passwordPending}
            className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordPending ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
