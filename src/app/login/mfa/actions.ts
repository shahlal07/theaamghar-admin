'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type MfaVerifyState = { error?: string } | undefined;

const CodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});

export async function verifyMfaLogin(
  _prev: MfaVerifyState,
  formData: FormData
): Promise<MfaVerifyState> {
  const parsed = CodeSchema.safeParse({ code: formData.get('code') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid code.' };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Session expired. Please sign in again.' };

  // Reuses the same rate-limit RPC/table as password login, under a
  // separate "mfa:" identifier bucket -- an aal1 session had no throttle at
  // all on this 6-digit code before, meaning it could be brute-forced
  // (1,000,000 combinations) directly against challengeAndVerify.
  const { data: rateLimit } = await supabase.rpc('check_and_record_login_attempt', {
    p_identifier: `mfa:${user.email}`,
  });
  const { allowed } = rateLimit?.[0] ?? { allowed: true };
  if (!allowed) {
    return { error: 'Too many incorrect codes. Please wait a few minutes and try again.' };
  }

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) return { error: 'Something went wrong. Please try again.' };

  const factor = factorsData.totp.find((f) => f.status === 'verified');
  if (!factor) return { error: 'No verified authenticator found for this account.' };

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: parsed.data.code,
  });

  if (error) return { error: 'Incorrect code. Please try again.' };

  await supabase.rpc('reset_login_attempts', { p_identifier: `mfa:${user.email}` });
  redirect('/admin');
}
