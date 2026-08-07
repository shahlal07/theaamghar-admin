'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adjustLeaderboardPoints, removeFromLeaderboard } from './actions';
import type { LeaderboardRow } from '@/lib/queries/loyalty';

function AdjustForm({ profileId }: { profileId: string }) {
  const [delta, setDelta] = useState('');
  const [state, formAction, pending] = useActionState(adjustLeaderboardPoints, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success('Points adjusted');
      // No callback on useActionState results other than watching them via
      // effect -- same accepted exception as the rest of the app's
      // toast+reset-form pattern (see Phase 17 notes in CLAUDE.md).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDelta('');
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={(fd) => {
        fd.set('profileId', profileId);
        fd.set('delta', delta);
        formAction(fd);
      }}
      className="flex items-center gap-1.5"
    >
      <input
        type="number"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        placeholder="±50"
        className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
      />
      <button
        type="submit"
        disabled={pending || !delta}
        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? '…' : 'Apply'}
      </button>
    </form>
  );
}

function RemoveButton({ profileId }: { profileId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(removeFromLeaderboard, undefined);

  useEffect(() => {
    if (state?.success) toast.success('Removed from leaderboard');
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Remove
      </button>
    );
  }

  return (
    <form action={(fd) => { fd.set('profileId', profileId); formAction(fd); }} className="flex items-center gap-1.5">
      <span className="text-xs text-[var(--text-light)]">Reset their points to 0?</span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? '…' : 'Confirm'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
      >
        Cancel
      </button>
    </form>
  );
}

export function LeaderboardManager({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--text-light)]">No customers on the leaderboard yet.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-2.5 last:border-b-0"
        >
          <div>
            <p className="text-sm font-medium text-[var(--text)]">
              #{i + 1} {r.name ?? r.email ?? 'Unknown'}
            </p>
            <p className="text-xs text-[var(--text-light)]">
              {r.lifetimePoints} lifetime pts · {r.mangoCredits} spendable credits
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdjustForm profileId={r.id} />
            <RemoveButton profileId={r.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
