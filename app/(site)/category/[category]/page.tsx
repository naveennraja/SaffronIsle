import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  CATEGORIES,
  getCategoryBySlug,
  getCategoryIcon,
  getCategorySlugs,
} from '@/lib/categories'
import { getArticlesByCategory, getArticleCountByCategory } from '@/lib/articles'
import { getSiteUrl } from '@/lib/utils'
import { ArticleGrid } from '@/components/articles/ArticleGrid'
import { CategoryArticlesClient } from './CategoryArticlesClient'
import { NewsletterForm } from '@/components/ui/NewsletterForm'

interface PageProps {
  params: { category: string }
}

export function generateStaticParams() {
  return getCategorySlugs().map((category) => ({ category }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = getCategoryBySlug(params.category)
  if (!category) return { title: 'Category not found' }

  return {
    title: category.label,
    description: category.description,
    alternates: {
      canonical: `${getSiteUrl()}/category/${category.slug}`,
    },
  }
}

export default function CategoryPage({ params }: PageProps) {
  const category = getCategoryBySlug(params.category)
  if (!category) notFound()

  const articles = getArticlesByCategory(params.category)
  const Icon = getCategoryIcon(category.icon)
  const count = getArticleCountByCategory(params.category)
  const otherCategories = CATEGORIES.filter((c) => c.slug !== params.category)

  const hasCityTagged = articles.some((a) => a.city && a.city !== 'all')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
      {/* Category header */}
      <header className="mb-10 overflow-hidden rounded-3xl border border-mist/60 bg-gradient-to-br from-cream via-white to-emerald-light/20 p-8 shadow-soft md:p-10">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-light text-emerald-dark shadow-soft">
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mb-2 font-serif text-h1 text-forest">{category.label}</h1>
        <p className="mb-3 max-w-2xl text-lg leading-relaxed text-forest/70">
          {category.description}
        </p>
        <p className="text-small font-medium text-forest/40">
          {count} {count === 1 ? 'article' : 'articles'}
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">
        <div>
          {hasCityTagged ? (
            <CategoryArticlesClient articles={articles} />
          ) : (
            <ArticleGrid articles={articles} />
          )}
        </div>

        <aside className="mt-12 lg:mt-0">
          <div className="lg:sticky lg:top-24 space-y-6">
            <section className="rounded-2xl border border-mist/60 bg-white p-6 shadow-soft">
              <h2 className="mb-4 font-serif text-h3 text-forest">
                Other categories
              </h2>
              <ul className="space-y-1">
                {otherCategories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/category/${cat.slug}`}
                      className="flex min-h-[36px] items-center rounded-lg px-3 text-small text-gray-700 no-underline transition-colors hover:bg-cream hover:text-emerald"
                    >
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-emerald/15 bg-gradient-to-br from-emerald-light/30 to-white p-6">
              <h2 className="mb-2 font-serif text-h3 text-forest">Newsletter</h2>
              <p className="mb-4 text-small leading-relaxed text-gray-600">
                Weekly tips for life in Ireland.
              </p>
              <NewsletterForm compact />
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
