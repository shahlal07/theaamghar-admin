'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { SupportConversation, SupportMessage } from '@/lib/queries/support';
import { startSupportConversation, sendSupportMessage, markSupportConversationRead } from './actions';

function MessageBubble({ message, adminName }: { message: SupportMessage; adminName: string }) {
  const isMine = message.senderType === 'customer';
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isMine
            ? 'bg-[var(--mango-orange)] text-white'
            : 'border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text)]'
        }`}
      >
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
          {isMine ? adminName : 'Nashemann Team'}
        </p>
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className="mt-1 text-right text-[10px] opacity-60">
          {new Date(message.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export function SupportClient({
  adminName,
  conversation,
  initialMessages,
}: {
  adminName: string;
  conversation: SupportConversation | null;
  initialMessages: SupportMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [conversationId, setConversationId] = useState(conversation?.id ?? null);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const [startState, startAction, startPending] = useActionState(startSupportConversation, undefined);
  const [replyState, replyAction, replyPending] = useActionState(sendSupportMessage, undefined);

  useEffect(() => {
    if (startState?.success && startState.conversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- useActionState has no completion callback
      setConversationId(startState.conversationId);
      if (startState.message) {
        const msg = startState.message;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      setDraft('');
    }
    if (startState?.error) toast.error(startState.error);
  }, [startState]);

  useEffect(() => {
    if (replyState?.success) {
      if (replyState.message) {
        const msg = replyState.message;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- useActionState has no completion callback
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      setDraft('');
    }
    if (replyState?.error) toast.error(replyState.error);
  }, [replyState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    if (conversation?.customerUnread) {
      markSupportConversationRead(conversationId).catch(() => {});
    }
  }, [conversationId, conversation?.customerUnread]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`support_conversation_${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as { id: string; sender_type: string; body: string; created_at: string };
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { id: row.id, senderType: row.sender_type, body: row.body, createdAt: row.created_at }]));
          if (row.sender_type === 'admin') markSupportConversationRead(conversationId).catch(() => {});
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  if (!conversationId) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-sm">
        <p className="mb-3 text-sm text-[var(--text-light)]">
          No conversation started yet. Send a message and someone from the Nashemann team will reply here.
        </p>
        <form action={startAction} className="flex flex-col gap-3">
          <textarea
            name="body"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="What do you need help with?"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
          />
          <button
            type="submit"
            disabled={startPending || !draft.trim()}
            className="self-start rounded-lg bg-[var(--mango-orange)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {startPending ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-[65vh] flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--text-light)]">No messages yet.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} adminName={adminName} />)
        )}
        <div ref={bottomRef} />
      </div>
      <form
        action={(fd) => {
          fd.set('conversationId', conversationId);
          replyAction(fd);
        }}
        className="flex items-end gap-2 border-t border-[var(--border-subtle)] p-3"
      >
        <textarea
          name="body"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
        <button
          type="submit"
          disabled={replyPending || !draft.trim()}
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {replyPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
