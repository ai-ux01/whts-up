'use client';

import { useEffect } from 'react';

// Catches errors in the root layout itself (must render its own <html>/<body>).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Fatal application error:', error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          The application crashed
        </h2>
        <p style={{ maxWidth: '28rem', fontSize: '0.875rem', color: '#666' }}>
          A fatal error occurred. Please reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: '0.375rem',
            background: '#16a34a',
            color: '#fff',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
