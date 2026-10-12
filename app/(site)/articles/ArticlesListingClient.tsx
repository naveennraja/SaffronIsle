'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { VISIBLE_CATEGORIES } from '@/lib/categories'
import { ArticleGrid } from '@/components/articles/ArticleGrid'
import type { ArticleMeta } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ArticlesListingClientProps {
  articles: ArticleMeta[]
}

export function ArticlesListingClient({ articles }: ArticlesListingClientProps) {
  const [category, setCategory] = useState<string>('all')

  const filtered = useMemo(() => {
    if (category === 'all') return articles
    return articles.filter((a) => a.category === category)
  }, [articles, category])

  return (
    <>
      <div
        className="mb-8 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter by category"
      >
        <button
          type="button"
          onClick={() => setCategory('all')}
          aria-pressed={category === 'all'}
          className={cn(
            'min-h-[44px] shrink-0 rounded-full px-4 py-2 text-small font-medium',
            category === 'all'
              ? 'bg-emerald text-white shadow-soft'
              : 'bg-white text-forest/70 shadow-soft ring-1 ring-mist hover:ring-emerald/20'
          )}
        >
          All
        </button>
        {VISIBLE_CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => setCategory(cat.slug)}
            aria-pressed={category === cat.slug}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full px-4 py-2 text-small font-medium whitespace-nowrap',
              category === cat.slug
                ? 'bg-emerald text-white shadow-soft'
                : 'bg-white text-forest/70 shadow-soft ring-1 ring-mist hover:ring-emerald/20'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <h2 className="sr-only">Articles</h2>
      <ArticleGrid articles={filtered} />
      <p className="mt-8 text-center text-small text-gray-500">
        Can&apos;t find what you need?{' '}
        <Link href="/search" className="text-emerald">
          Search all articles
        </Link>
      </p>
    </>
  )
}
