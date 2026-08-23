'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { submitVendorBugReport } from './actions';

export function ReportBugClient() {
  const [state, formAction, pending] = useActionState(submitVendorBugReport, undefined);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Report sent — we'll take a look.");
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- useActionState has no completion callback
      setFileName(null);
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="max-w-xl space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Title
        </label>
        <input
          name="title"
          required
          maxLength={200}
          placeholder="e.g. Order status doesn't update after packing"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          What happened?
        </label>
        <textarea
          name="description"
          required
          rows={5}
          placeholder="What were you doing, what did you expect, and what actually happened?"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Screenshot (optional)
        </label>
        <input
          type="file"
          name="screenshot"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="block w-full text-sm text-[var(--text-light)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--mango-orange)]/15 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--mango-orange)]"
        />
        {fileName && <p className="mt-1 text-xs text-[var(--text-light)]">{fileName}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--mango-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send report'}
      </button>
    </form>
  );
}
