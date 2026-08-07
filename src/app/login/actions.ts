'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const LoginSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }),
  password: z.string().min(1, { error: 'Password is required.' }),
});

export type LoginState = {
  error?: string;
} | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();

  // Atomic DB-side check-and-increment, keyed by email, so concurrent
  // requests can't race past the lockout. A `true` result only means "not
  // currently rate-limited" — it says nothing about whether the password
  // is correct, so this must run before, not instead of, signInWithPassword.
  const { data: rateLimit, error: rateLimitError } = await supabase.rpc(
    'check_and_record_login_attempt',
    { p_identifier: parsed.data.email }
  );

  if (rateLimitError) {
    return { error: 'Something went wrong. Please try again.' };
  }

  const { allowed, retry_after } = rateLimit?.[0] ?? { allowed: true, retry_after: null };
  if (!allowed) {
    const minutes = retry_after
      ? Math.max(1, Math.ceil((new Date(retry_after).getTime() - Date.now()) / 60000))
      : 15;
    return { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: 'Incorrect email or password.' };
  }

  await supabase.rpc('reset_login_attempts', { p_identifier: parsed.data.email });

  // Password is correct but that's only aal1. If this account has a
  // verified TOTP factor enrolled, Supabase won't consider the session
  // fully authenticated (aal2) until the code is checked too.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
    redirect('/login/mfa');
  }

  redirect('/admin');
}
