import 'server-only';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Thin wrapper around Groq's OpenAI-compatible chat completions endpoint.
 * Read-only by design at the call sites that use this (review reply drafts,
 * the order-management assistant) — this function itself has no knowledge
 * of the app and cannot take actions, it only returns text.
 */
export async function groqComplete(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in .env.local.');
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.6,
      max_tokens: options?.maxTokens ?? 400,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq returned an empty response.');
  }
  return content.trim();
}
