'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { logError } from '@/lib/log-error';

// A stale JS chunk reference (page open across a deploy that replaced the
// build, or a flaky connection) fails with one of these -- unstable_retry()
// re-renders in place but can't fix it since the chunk URL itself is gone,
// only a real reload re-fetches the current build.
function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      error.message
    )
  );
}

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    logError(error);
    if (isChunkLoadError(error)) {
      const key = "vendor_admin_chunk_reload_attempted";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
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
          onClick={() => (isChunkLoadError(error) ? window.location.reload() : unstable_retry())}
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
