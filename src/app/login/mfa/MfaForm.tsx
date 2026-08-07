'use client';

import { useActionState } from 'react';
import { verifyMfaLogin } from './actions';

export function MfaForm() {
  const [state, formAction, pending] = useActionState(verifyMfaLogin, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="code"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]"
        >
          Authenticator code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          autoFocus
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-center text-lg tracking-[0.5em] text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20"
          placeholder="000000"
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--mango-orange)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Verifying…' : 'Verify'}
      </button>
    </form>
  );
}
