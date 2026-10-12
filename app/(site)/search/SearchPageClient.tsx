'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Fuse from 'fuse.js'
import { SearchBar } from '@/components/ui/SearchBar'
import { ArticleGrid } from '@/components/articles/ArticleGrid'
import type { ArticleMeta } from '@/lib/types'

interface SearchPageClientProps {
  articles: ArticleMeta[]
}

export function SearchPageClient({ articles }: SearchPageClientProps) {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const results = useMemo(() => {
    if (!query.trim()) return []
    const fuse = new Fuse(articles, {
      keys: ['title', 'description', 'tags'],
      threshold: 0.4,
    })
    return fuse.search(query).map((r) => r.item)
  }, [articles, query])

  return (
    <>
      <SearchBar defaultValue={query} className="mb-8" />
      {query ? (
        <>
          <p className="mb-6 text-small text-gray-500">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}
            &rdquo;
          </p>
          <h2 className="sr-only">Results</h2>
          <ArticleGrid articles={results} />
        </>
      ) : (
        <p className="text-gray-500">Enter a search term to find articles.</p>
      )}
    </>
  )
}
