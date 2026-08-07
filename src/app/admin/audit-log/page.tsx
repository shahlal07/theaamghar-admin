import { getAuditLog, getAuditLogFilterValues } from '@/lib/queries/audit-log';
import { requireAdmin } from '@/lib/dal';
import { AuditLogClient } from './AuditLogClient';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>;
}) {
  await requireAdmin();

  const { entity, action, page: pageParam } = await searchParams;
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);

  const [{ entries, totalCount, pageSize }, filterValues] = await Promise.all([
    getAuditLog(page, entity, action),
    getAuditLogFilterValues(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Audit Log</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Immutable record of every admin action — who changed what, and when. Used for
        accountability and to investigate anything that looks off.
      </p>
      <AuditLogClient
        entries={entries}
        entityFilter={entity ?? 'all'}
        actionFilter={action ?? 'all'}
        entityTypes={filterValues.entityTypes}
        actions={filterValues.actions}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
      />
    </div>
  );
}
