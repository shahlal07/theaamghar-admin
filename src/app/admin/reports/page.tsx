import { ReportsClient } from './ReportsClient';

export default function ReportsPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Reports</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Export data as CSV, Excel, or PDF.
      </p>
      <ReportsClient />
    </div>
  );
}
