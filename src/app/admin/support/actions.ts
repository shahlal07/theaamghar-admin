'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';

export type SentMessage = { id: string; senderType: string; body: string; createdAt: string };
export type ActionState = { error?: string; success?: boolean; conversationId?: string; message?: SentMessage } | undefined;

const BodySchema = z.string().trim().min(1, 'Message cannot be empty.').max(4000);

// Both RPCs only return the conversation id / void, not the row they just
// inserted -- and the client's Realtime subscription for a brand-new
// conversation isn't mounted until *after* this action returns (it depends
// on conversationId, which only exists once this resolves), so the very
// first message in a conversation was inserted before anything was
// listening for it. Fetching the just-sent row back here and returning it
// lets the client add it to local state directly instead of relying on a
// Realtime event that can never arrive for that specific insert.
async function fetchLatestOwnMessage(supabase: Awaited<ReturnType<typeof createClient>>, conversationId: string): Promise<SentMessage | undefined> {
  const { data } = await supabase
    .from('support_messages')
    .select('id, sender_type, body, created_at')
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'customer')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return undefined;
  return { id: data.id, senderType: data.sender_type, body: data.body, createdAt: data.created_at };
}

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

  const conversationId = data as string;
  const message = await fetchLatestOwnMessage(supabase, conversationId);

  await logAdminAction(admin, 'start_support_conversation', 'support_conversation', conversationId);
  revalidatePath('/admin/support');
  return { success: true, conversationId, message };
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

  const message = await fetchLatestOwnMessage(supabase, parsed.data.conversationId);

  await logAdminAction(admin, 'send_support_message', 'support_conversation', parsed.data.conversationId);
  revalidatePath('/admin/support');
  return { success: true, message };
}

export async function markSupportConversationRead(conversationId: string): Promise<void> {
  await getAdminUser();
  const supabase = await createClient();
  await supabase.rpc('mark_support_conversation_read', { p_conversation_id: conversationId });
  revalidatePath('/admin/support');
}
