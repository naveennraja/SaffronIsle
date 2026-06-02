import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSiteUrl } from '@/lib/utils'
import { SearchPageClient } from './SearchPageClient'
import { getAllArticles } from '@/lib/articles'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Saffron Isle guides and articles for Indians in Ireland.',
  alternates: { canonical: `${getSiteUrl()}/search` },
}

export default function SearchPage() {
  const articles = getAllArticles()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <h1 className="mb-2 font-serif text-h1 text-forest">Search</h1>
        <p className="text-body text-forest/60">
          Find guides, tips, and stories across all topics.
        </p>
      </header>
      <Suspense fallback={<p className="text-gray-500">Loading search…</p>}>
        <SearchPageClient articles={articles} />
      </Suspense>
    </div>
  )
}
