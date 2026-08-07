import { AssistantClient } from './AssistantClient';

export default function AssistantPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">AI Assistant</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Ask questions about your orders, inventory, and sales — grounded in your real data, powered
        by Groq.
      </p>
      <AssistantClient />
    </div>
  );
}
