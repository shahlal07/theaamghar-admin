'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { sendAnnouncement } from './actions';

export function AnnouncementForm() {
  const [state, formAction, pending] = useActionState(sendAnnouncement, undefined);

  useEffect(() => {
    if (state && 'success' in state) {
      toast.success(`Sent to ${state.recipientCount} customer${state.recipientCount === 1 ? '' : 's'}`);
    }
    if (state && 'error' in state) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Category
        </label>
        <select
          name="category"
          defaultValue="harvestNews"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        >
          <option value="harvestNews">New Harvest Announcement</option>
          <option value="promotions">Offer / Promotion</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Title
        </label>
        <input
          name="title"
          required
          maxLength={120}
          placeholder="Sindhri season is here! 🥭"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Message
        </label>
        <textarea
          name="message"
          required
          maxLength={1000}
          rows={5}
          placeholder="The first Sindhri boxes of the season just landed — order before they sell out."
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--mango-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send Announcement'}
      </button>
    </form>
  );
}
