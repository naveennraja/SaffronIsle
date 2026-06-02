import { ArticleCard } from './ArticleCard'
import type { ArticleMeta } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ArticleGridProps {
  articles: ArticleMeta[]
  className?: string
}

export function ArticleGrid({ articles, className }: ArticleGridProps) {
  if (articles.length === 0) {
    return (
      <p className="py-12 text-center text-gray-500">
        No articles found. Check back soon!
      </p>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3',
        className
      )}
    >
      {articles.map((article) => (
        <ArticleCard key={article.slug} article={article} />
      ))}
    </div>
  )
}
