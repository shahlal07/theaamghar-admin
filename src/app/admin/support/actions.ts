'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type ActionState = { error?: string; success?: boolean; conversationId?: string } | undefined;

const BodySchema = z.string().trim().min(1, 'Message cannot be empty.').max(4000);

export async function startSupportConversation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminUser();
  const parsed = BodySchema.safeParse(formData.get('body'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid message.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('start_support_conversation', {
    p_body: parsed.data,
    p_vendor_id: admin.vendor_id,
  });
  if (error) return { error: `Couldn't send your message: ${error.message}` };

  await logAdminAction(admin, 'start_support_conversation', 'support_conversation', data as string);
  revalidatePath('/admin/support');
  return { success: true, conversationId: data as string };
}

const ReplySchema = z.object({
  conversationId: z.uuid(),
  body: BodySchema,
});

export async function sendSupportMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminUser();
  const parsed = ReplySchema.safeParse({
    conversationId: formData.get('conversationId'),
    body: formData.get('body'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('send_customer_support_message', {
    p_conversation_id: parsed.data.conversationId,
    p_body: parsed.data.body,
  });
  if (error) return { error: `Couldn't send your message: ${error.message}` };

  await logAdminAction(admin, 'send_support_message', 'support_conversation', parsed.data.conversationId);
  revalidatePath('/admin/support');
  return { success: true };
}

export async function markSupportConversationRead(conversationId: string): Promise<void> {
  await getAdminUser();
  const supabase = await createClient();
  await supabase.rpc('mark_support_conversation_read', { p_conversation_id: conversationId });
  revalidatePath('/admin/support');
}
