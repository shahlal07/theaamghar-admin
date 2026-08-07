'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';

export type MfaFactor = { id: string; friendlyName: string | null; createdAt: string };

export async function listMfaFactors(): Promise<MfaFactor[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return [];
  return data.totp
    .filter((f) => f.status === 'verified')
    .map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, createdAt: f.created_at }));
}

export type EnrollState =
  | { error: string }
  | { factorId: string; qrCode: string; secret: string }
  | undefined;

export async function enrollMfaFactor(): Promise<EnrollState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `admin-${Date.now()}`,
  });

  if (error) return { error: error.message };

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export type VerifyEnrollState = { error?: string; success?: boolean } | undefined;

const VerifySchema = z.object({
  factorId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});

export async function verifyMfaEnrollment(
  _prev: VerifyEnrollState,
  formData: FormData
): Promise<VerifyEnrollState> {
  await requireAdmin();

  const parsed = VerifySchema.safeParse({
    factorId: formData.get('factorId'),
    code: formData.get('code'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: parsed.data.factorId,
  });
  if (challengeError) return { error: challengeError.message };

  const { error } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (error) return { error: 'Incorrect code. Please try again.' };

  revalidatePath('/admin/settings');
  return { success: true };
}

const UnenrollSchema = z.object({ factorId: z.string().min(1) });

export async function unenrollMfaFactor(
  _prev: VerifyEnrollState,
  formData: FormData
): Promise<VerifyEnrollState> {
  await requireAdmin();

  const parsed = UnenrollSchema.safeParse({ factorId: formData.get('factorId') });
  if (!parsed.success) return { error: 'Invalid factor.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId: parsed.data.factorId });
  if (error) return { error: error.message };

  revalidatePath('/admin/settings');
  return { success: true };
}
