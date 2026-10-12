'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Catches a render error anywhere in the public site.
 *
 * Most pages here are generated at build time, where a throw fails the build
 * loudly and never reaches a visitor — which is the behaviour lib/articles.ts
 * relies on when it rejects bad frontmatter. This is for the rest: a rendering
 * fault on a dynamic path, where the alternative is Next's unstyled default
 * error screen.
 *
 * Renders no chrome of its own — app/(site)/layout.tsx supplies the navbar and
 * footer, as with not-found.tsx alongside it.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // withholds from the browser in production.
    console.error('Site error:', error)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="mb-4 font-serif text-h1 text-forest">Something went wrong</h1>
      <p className="mb-8 text-gray-600">
        This page failed to load. It is not something you did — please try again,
        and if it keeps happening the article may be temporarily unavailable.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-saffron px-6 py-3 font-semibold text-forest shadow-soft transition hover:bg-saffron-light"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-mist px-6 py-3 font-semibold text-forest transition hover:bg-cream"
        >
          Go to the homepage
        </Link>
      </div>
      {error.digest && (
        <p className="mt-8 text-small text-gray-400">Reference: {error.digest}</p>
      )}
    </div>
  )
}
