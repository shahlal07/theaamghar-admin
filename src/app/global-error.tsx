'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { logError } from '@/lib/log-error';

// Catches errors thrown by the root layout itself. Deliberately
// self-contained: no shared layout/fonts/providers, since those are
// exactly what might have just failed.
export default function GlobalError({
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
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ maxWidth: 480, margin: '6rem auto', padding: '0 5%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b6b6b', marginBottom: '2rem' }}>
            The admin dashboard hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={unstable_retry}
            style={{
              background: '#f5871f',
              color: 'white',
              fontWeight: 600,
              padding: '0.75rem 2rem',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
