'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { logError } from '@/lib/log-error';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    logError(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-[5%] py-24 text-center">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text)]">Something went wrong</h1>
      <p className="mb-8 text-[var(--text-light)]">
        We hit a snag loading this page. Please try again, or head back to the dashboard.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={unstable_retry}
          className="rounded-full bg-[var(--mango-orange)] px-8 py-3 font-semibold text-white transition hover:bg-[var(--mango-deep)]"
        >
          Try Again
        </button>
        <Link
          href="/admin"
          className="rounded-full border border-[var(--border-subtle)] px-8 py-3 font-semibold text-[var(--text)] hover:border-[var(--mango-orange)] hover:text-[var(--mango-orange)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
