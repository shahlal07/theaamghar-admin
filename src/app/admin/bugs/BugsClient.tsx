'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import type { BugReport } from '@/lib/queries/bug-reports';
import { confirmBugReport, rejectBugReport, getBugReportScreenshotUrl } from './actions';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
] as const;

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending review',
      className: 'bg-[var(--surface-sunken)] text-[var(--text-light)]',
    },
    confirmed: {
      label: 'Confirmed — +1',
      className: 'bg-green-500/15 text-green-600 dark:text-green-400',
    },
    rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  };
  const meta = map[status] ?? map.pending;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function Screenshot({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getBugReportScreenshotUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (url === undefined) {
    return <p className="text-xs text-[var(--text-light)]">Loading screenshot…</p>;
  }
  if (!url) {
    return <p className="text-xs text-[var(--text-light)]">Couldn&apos;t load screenshot.</p>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element -- private bucket, signed URL, not next/image-optimizable */}
      <img
        src={url}
        alt="Customer-attached screenshot"
        className="max-h-64 w-auto rounded-lg border border-[var(--border-subtle)]"
      />
    </a>
  );
}

function BugRow({ report }: { report: BugReport }) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmBugReport, undefined);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectBugReport, undefined);

  useEffect(() => {
    if (confirmState?.success) toast.success('Confirmed — customer credited 1 point');
    if (confirmState?.error) toast.error(confirmState.error);
  }, [confirmState]);

  useEffect(() => {
    if (rejectState?.success) {
      toast.success('Report rejected');
      // Same "reset local UI after a useActionState submission" exception
      // used throughout this app -- useActionState has no completion
      // callback, so watching the result via effect is the only hook.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRejecting(false);
    }
    if (rejectState?.error) toast.error(rejectState.error);
  }, [rejectState]);

  const isPending = report.status === 'pending';

  return (
    <div className="border-b border-[var(--border-subtle)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-[var(--text)]">{report.title}</p>
          <p className="mt-0.5 text-xs text-[var(--text-light)]">
            {report.reporter_name}
            {report.reporter_email ? ` · ${report.reporter_email}` : ''} ·{' '}
            {new Date(report.created_at).toLocaleDateString('en-PK', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </button>
        <StatusPill status={report.status} />
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg bg-[var(--surface-sunken)] p-3">
          <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{report.description}</p>

          {report.screenshot_path && (
            <div className="mt-3">
              <Screenshot path={report.screenshot_path} />
            </div>
          )}

          {report.ai_reply && (
            <div className="mt-3 rounded-lg bg-[var(--mango-orange)]/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mango-orange)]">
                ✨ AI acknowledgment sent to customer
              </p>
              <p className="mt-1 text-sm text-[var(--text)]">{report.ai_reply}</p>
            </div>
          )}

          {!isPending && report.admin_note && (
            <div className="mt-3 rounded-lg border border-[var(--border-subtle)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
                Your note {report.reviewed_at ? `(${new Date(report.reviewed_at).toLocaleDateString('en-PK')})` : ''}
              </p>
              <p className="mt-1 text-sm text-[var(--text)]">{report.admin_note}</p>
            </div>
          )}

          {isPending && (
            <>
              {rejecting ? (
                <form
                  action={(fd) => {
                    fd.set('bugId', report.id);
                    fd.set('adminNote', rejectReason);
                    rejectAction(fd);
                  }}
                  className="mt-3"
                >
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
                    Why isn&apos;t this a bug? (the customer sees this)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. That's expected behavior — orders can only be cancelled before packing."
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={rejectPending || !rejectReason.trim()}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rejectPending ? 'Saving…' : 'Confirm rejection'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(false)}
                      className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={confirmAction}>
                    <input type="hidden" name="bugId" value={report.id} />
                    <button
                      type="submit"
                      disabled={confirmPending}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {confirmPending ? 'Saving…' : 'Confirm — grant 1 point'}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setRejecting(true)}
                    className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10"
                  >
                    Reject
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function BugsClient({ reports }: { reports: BugReport[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reports.length, pending: 0, confirmed: 0, rejected: 0 };
    for (const r of reports) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [reports]);

  const filtered = useMemo(
    () => (tab === 'all' ? reports : reports.filter((r) => r.status === tab)),
    [reports, tab]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-[var(--mango-orange)] text-white'
                : 'border border-[var(--border-subtle)] text-[var(--text)] hover:bg-[var(--surface-sunken)]'
            }`}
          >
            {t.label} ({counts[t.key] ?? 0})
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-light)] shadow-sm">
          No bug reports yet.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-light)] shadow-sm">
          Nothing in this tab.
        </p>
      ) : (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          {filtered.map((r) => (
            <BugRow key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
