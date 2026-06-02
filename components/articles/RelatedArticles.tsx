import { ArticleGrid } from './ArticleGrid'
import type { ArticleMeta } from '@/lib/types'

interface RelatedArticlesProps {
  articles: ArticleMeta[]
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null

  return (
    <section className="mt-12 border-t border-mist/80 pt-12">
      <h2 className="mb-6 font-serif text-h2 text-forest">Related articles</h2>
      <ArticleGrid articles={articles} />
    </section>
  )
}
