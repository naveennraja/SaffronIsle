'use client'

import { useMemo, useState } from 'react'
import { CityFilter } from '@/components/ui/CityFilter'
import { ArticleGrid } from '@/components/articles/ArticleGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { ArticleMeta } from '@/lib/types'

interface RecentArticlesSectionProps {
  articles: ArticleMeta[]
}

export function RecentArticlesSection({ articles }: RecentArticlesSectionProps) {
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
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          eyebrow="Latest"
          title="Recent articles"
          description="Fresh guides and updates from the community."
        />
        <CityFilter active={city} onFilter={setCity} className="mb-8" />
        <ArticleGrid articles={filtered} />
      </div>
    </section>
  )
}
