'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { AuditLogEntry } from '@/lib/queries/audit-log';

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-[var(--orchard-green)]/15 text-[var(--orchard-green)]',
  delete: 'bg-[var(--error)]/15 text-[var(--error)]',
};

function actionBadgeClass(action: string): string {
  if (action.includes('delete')) return ACTION_STYLES.delete;
  if (action.includes('create')) return ACTION_STYLES.create;
  return 'bg-[var(--mango-orange)]/15 text-[var(--mango-orange)]';
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

export function AuditLogClient({
  entries,
  entityFilter,
  actionFilter,
  entityTypes,
  actions,
  page,
  pageSize,
  totalCount,
}: {
  entries: AuditLogEntry[];
  entityFilter: string;
  actionFilter: string;
  entityTypes: string[];
  actions: string[];
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') params.delete(key);
    else params.set(key, value);
    // Any filter change resets to page 1 — staying on page 5 of the old
    // filter would usually land on an empty page.
    params.delete('page');
    router.push(`/admin/audit-log?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams);
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    router.push(`/admin/audit-log?${params.toString()}`);
  }

  const selectClass =
    'rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]';

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={entityFilter}
          onChange={(e) => setParam('entity', e.target.value)}
          className={selectClass}
          aria-label="Filter by entity type"
        >
          <option value="all">All entities</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {humanize(t)}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setParam('action', e.target.value)}
          className={selectClass}
          aria-label="Filter by action"
        >
          <option value="all">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {humanize(a)}
            </option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-light)] shadow-sm">
          {totalCount === 0 && entityFilter === 'all' && actionFilter === 'all'
            ? 'No admin actions recorded yet — changes made in the panel (order updates, product edits, coupon changes, etc.) will appear here.'
            : 'No entries match these filters.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wide text-[var(--text-light)]">
                <th className="py-3 pl-5 pr-4">When</th>
                <th className="py-3 pr-4">Admin</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Entity</th>
                <th className="py-3 pr-5">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border-subtle)] last:border-b-0 align-top">
                  <td className="py-3 pl-5 pr-4 whitespace-nowrap text-[var(--text-light)]">
                    {new Date(e.created_at).toLocaleString('en-PK', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="py-3 pr-4 text-[var(--text)]">{e.actor_email}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionBadgeClass(
                        e.action
                      )}`}
                    >
                      {humanize(e.action)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text)]">
                    <div>{humanize(e.entity_type)}</div>
                    {e.entity_id && (
                      <div className="font-mono text-xs text-[var(--text-light)]">
                        {e.entity_id.length > 12 ? `${e.entity_id.slice(0, 8)}…` : e.entity_id}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-5 text-[var(--text-light)]">
                    {e.detail ? (
                      <code className="block max-w-md whitespace-pre-wrap break-words text-xs">
                        {JSON.stringify(e.detail)}
                      </code>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-light)]">
          <span>
            Page {page} of {totalPages} · {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
