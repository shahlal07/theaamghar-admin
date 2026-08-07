import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { MfaForm } from './MfaForm';

export default async function MfaPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect('/login');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel === aal.nextLevel) redirect('/admin');

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

        <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Two-factor verification</h1>
        <p className="mb-6 text-sm text-[var(--text-light)]">
          Enter the 6-digit code from your authenticator app to finish signing in.
        </p>

        <Suspense fallback={null}>
          <MfaForm />
        </Suspense>
      </div>
    </div>
  );
}
