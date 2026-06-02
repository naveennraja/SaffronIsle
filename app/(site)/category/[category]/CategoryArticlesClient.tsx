'use client'

import { useMemo, useState } from 'react'
import { CityFilter } from '@/components/ui/CityFilter'
import { ArticleGrid } from '@/components/articles/ArticleGrid'
import type { ArticleMeta } from '@/lib/types'

interface CategoryArticlesClientProps {
  articles: ArticleMeta[]
}

export function CategoryArticlesClient({ articles }: CategoryArticlesClientProps) {
  const [city, setCity] = useState('all')

  const filtered = useMemo(() => {
    if (city === 'all') return articles
    if (city === 'other') {
      return articles.filter(
        (a) =>
          a.city &&
          !['dublin', 'cork', 'galway', 'limerick', 'all'].includes(a.city)
      )
    }
    return articles.filter((a) => a.city === city || a.city === 'all')
  }, [articles, city])

  return (
    <>
      <CityFilter active={city} onFilter={setCity} className="mb-8" />
      <ArticleGrid articles={filtered} />
    </>
  )
}
