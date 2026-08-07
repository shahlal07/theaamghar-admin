import { getBugReports } from '@/lib/queries/bug-reports';
import { BugsClient } from './BugsClient';

export const dynamic = 'force-dynamic';

export default async function BugsPage() {
  const reports = await getBugReports();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Bug Reports</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Review bugs customers reported. Confirming one grants the reporter 1 mango credit —
        rejecting requires a short note explaining why, which the customer can see.
      </p>
      <BugsClient reports={reports} />
    </div>
  );
}
