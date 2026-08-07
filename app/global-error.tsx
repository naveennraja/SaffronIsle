'use client'

import { useEffect } from 'react'

/**
 * The last line of defence: a fault in the root layout itself, which is above
 * every other boundary and so replaces the whole document.
 *
 * Because it stands in for app/layout.tsx, it has to supply its own <html> and
 * <body> — and it cannot rely on that layout's fonts or globals.css having
 * loaded, which is why the styling here is inline rather than Tailwind. This
 * file should effectively never render; when it does, plain and readable beats
 * on-brand.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#1f2937',
          background: '#fffdf8',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            Saffron Isle is temporarily unavailable
          </h1>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.6, color: '#4b5563' }}>
            Something went wrong while loading the site. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: '9999px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              background: '#e8833a',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#9ca3af' }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
