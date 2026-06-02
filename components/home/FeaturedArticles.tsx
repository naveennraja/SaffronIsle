import { ArticleCard } from '@/components/articles/ArticleCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { ArticleMeta } from '@/lib/types'

interface FeaturedArticlesProps {
  articles: ArticleMeta[]
}

export function FeaturedArticles({ articles }: FeaturedArticlesProps) {
  if (articles.length === 0) return null

  return (
    <section className="relative py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          eyebrow="Editor's picks"
          title="Featured guides"
          description="Hand-picked articles to help you land, settle, and thrive."
          href="/articles"
          linkLabel="All articles"
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              size="featured"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
