import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-sunken)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--mango-orange)] text-lg font-extrabold text-white shadow-md">
            AG
          </div>
          <div className="text-xl font-bold text-[var(--text)]">
            The<span className="text-[var(--mango-orange)]">AamGhar</span>
          </div>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">
          Admin sign in
        </h1>
        <p className="mb-6 text-sm text-[var(--text-light)]">
          Sign in with your admin account to manage the business.
        </p>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
