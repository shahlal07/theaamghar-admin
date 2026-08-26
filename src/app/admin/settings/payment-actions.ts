'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';
import { PAYMENT_METHODS } from '@/lib/payment-methods';

export type PaymentAccountState = { error?: string; success?: boolean } | undefined;

const strOrNull = (v: FormDataEntryValue | null) =>
  v === null || String(v).trim() === '' ? null : String(v).trim();

const PaymentAccountSchema = z.object({
  id: z.string().uuid().nullable(),
  method: z.enum(PAYMENT_METHODS),
  label: z.string().min(1, 'Label is required.'),
  accountTitle: z.string().min(1, 'Account title is required.'),
  accountNumber: z.string().min(1, 'Account number is required.'),
  bankName: z.string().nullable(),
  iban: z.string().nullable(),
  instructions: z.string().nullable(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export async function savePaymentAccount(
  _prev: PaymentAccountState,
  formData: FormData
): Promise<PaymentAccountState> {
  const admin = await requireAdmin();

  const parsed = PaymentAccountSchema.safeParse({
    id: strOrNull(formData.get('id')),
    method: formData.get('method'),
    label: formData.get('label'),
    accountTitle: formData.get('accountTitle'),
    accountNumber: formData.get('accountNumber'),
    bankName: strOrNull(formData.get('bankName')),
    iban: strOrNull(formData.get('iban')),
    instructions: strOrNull(formData.get('instructions')),
    active: formData.get('active') === 'true',
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const d = parsed.data;
  const supabase = await createClient();
  const row = {
    method: d.method,
    label: d.label,
    account_title: d.accountTitle,
    account_number: d.accountNumber,
    bank_name: d.bankName,
    iban: d.iban,
    instructions: d.instructions,
    active: d.active,
    sort_order: d.sortOrder,
    updated_at: new Date().toISOString(),
  };

  if (d.id) {
    const { error } = await supabase.from('payment_accounts').update(row).eq('id', d.id);
    if (error) return { error: `Failed to save: ${error.message}` };
    await logAdminAction(admin, 'update', 'payment_account', d.id, { method: d.method });
  } else {
    // vendor_id has no DB default and the insert RLS policy requires it to
    // equal the caller's own vendor -- omitting it here made "+ Add
    // account" fail outright for every vendor (real bug, found live: it
    // errored with an RLS violation the first time this form was actually
    // submitted through the UI rather than seeded via SQL).
    const { data, error } = await supabase
      .from('payment_accounts')
      .insert({ ...row, vendor_id: admin.vendor_id })
      .select('id')
      .single();
    if (error) return { error: `Failed to create: ${error.message}` };
    await logAdminAction(admin, 'create', 'payment_account', data.id, { method: d.method });
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

export async function deletePaymentAccount(
  _prev: PaymentAccountState,
  formData: FormData
): Promise<PaymentAccountState> {
  const admin = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'Missing account id.' };

  const supabase = await createClient();
  const { error } = await supabase.from('payment_accounts').delete().eq('id', id);
  if (error) return { error: `Failed to delete: ${error.message}` };

  await logAdminAction(admin, 'delete', 'payment_account', id);
  revalidatePath('/admin/settings');
  return { success: true };
}
