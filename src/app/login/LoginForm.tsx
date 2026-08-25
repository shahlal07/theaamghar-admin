'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from './actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const queryError =
    errorParam === 'not_admin'
      ? "That account doesn't have admin access. Sign in with an admin account instead."
      : errorParam === 'vendor_inactive'
        ? 'This store is suspended. Contact Nashemann support to reactivate it.'
        : null;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20"
          placeholder="admin@theaamghar.pk"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20"
          placeholder="••••••••"
        />
      </div>

      {(state?.error || queryError) && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400"
        >
          {state?.error ?? queryError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--mango-orange)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
