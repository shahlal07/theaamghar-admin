'use client';

import { useState, useRef, useEffect } from 'react';
import { askAssistant } from './actions';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'What orders need attention today?',
  'Summarize this month so far',
  'What products are low on stock?',
  'How much COD money is still uncollected?',
];

export function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || pending) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(nextMessages);
    setInput('');
    setPending(true);

    const fd = new FormData();
    fd.set('question', q);
    fd.set('history', JSON.stringify(messages.slice(-10)));

    const result = await askAssistant(undefined, fd);
    setPending(false);

    if (result?.error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${result.error}` }]);
      return;
    }
    if (result?.reply) {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply! }]);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div>
            <p className="mb-3 text-sm text-[var(--text-light)]">
              Ask about orders, stock, or sales — answers are grounded in your real data. This
              assistant can only answer questions, it can&apos;t change anything for you.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-[var(--mango-orange)] text-white'
                  : 'bg-[var(--surface-sunken)] text-[var(--text)]'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[var(--surface-sunken)] px-4 py-2.5 text-sm text-[var(--text-light)]">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-[var(--border-subtle)] p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about orders, stock, sales…"
          disabled={pending}
          className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
