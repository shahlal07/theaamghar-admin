import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type SupportConversation = {
  id: string;
  status: string;
  lastMessageAt: string;
  lastMessageBy: string;
  customerUnread: boolean;
  createdAt: string;
};

export type SupportMessage = {
  id: string;
  senderType: string;
  body: string;
  createdAt: string;
};

// One conversation per admin account (customer_id = the signed-in admin's
// own profile id) -- the underlying send_customer_support_message RPC only
// lets the original starter reply, so this can't be a single shared
// per-vendor inbox; each staff member gets their own thread with Nashemann
// support, though anyone on the same vendor can still read it (see the
// vendor-scoped staff SELECT policy on support_conversations).
export async function getMySupportConversation(customerId: string): Promise<SupportConversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('support_conversations')
    .select('id, status, last_message_at, last_message_by, customer_unread, created_at')
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load support conversation: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    lastMessageAt: data.last_message_at,
    lastMessageBy: data.last_message_by,
    customerUnread: data.customer_unread,
    createdAt: data.created_at,
  };
}

export async function getConversationMessages(conversationId: string): Promise<SupportMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, sender_type, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id,
    senderType: m.sender_type,
    body: m.body,
    createdAt: m.created_at,
  }));
}
