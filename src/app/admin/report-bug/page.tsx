import { ReportBugClient } from './ReportBugClient';

export const dynamic = 'force-dynamic';

export default function ReportBugPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Report a Bug</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Found something broken on nashemann.store, your storefront, or this admin panel? Report it
        directly to the Nashemann platform team — anything, anytime, no restrictions.
      </p>
      <ReportBugClient />
    </div>
  );
}
