import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  getAllArticleSlugs,
  getArticleBySlug,
  getRelatedArticles,
} from '@/lib/articles'
import { getCategoryBySlug } from '@/lib/categories'
import { getSiteUrl } from '@/lib/utils'
import { extractTocFromMdx } from '@/lib/toc'
import { ArticleHeader } from '@/components/articles/ArticleHeader'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { TableOfContents } from '@/components/articles/TableOfContents'
import { NewsletterBanner } from '@/components/ui/NewsletterBanner'
import { NEWSLETTER_ENABLED } from '@/lib/site-config'
import { formatDate } from '@/lib/utils'

const RelatedArticles = dynamic(
  () =>
    import('@/components/articles/RelatedArticles').then((m) => ({
      default: m.RelatedArticles,
    })),
  { ssr: true }
)

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Article not found' }

  const url = `${getSiteUrl()}/articles/${article.slug}`
  // The on-page <h1> always uses `title`; only the search/social title varies.
  const seoTitle = article.metaTitle || article.title
  // Likewise the standfirst and the cards always use `description`.
  const seoDescription = article.metaDescription || article.description

  return {
    title: seoTitle,
    description: seoDescription,
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      images: [article.coverImage],
      type: 'article',
      publishedTime: article.date,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [article.coverImage],
    },
    alternates: {
      canonical: url,
    },
  }
}

function ArticleJsonLd({ article }: { article: NonNullable<ReturnType<typeof getArticleBySlug>> }) {
  const category = getCategoryBySlug(article.category)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    // Search-facing, like the <meta> tags above — not the standfirst.
    description: article.metaDescription || article.description,
    image: `${getSiteUrl()}${article.coverImage}`,
    datePublished: article.date,
    dateModified: article.lastUpdated ?? article.date,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Saffron Isle',
    },
    articleSection: category?.label,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const related = getRelatedArticles(slug, 3)
  const toc = extractTocFromMdx(article.content)
  const { content, ...meta } = article

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
      <ArticleJsonLd article={article} />
      <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
        <div className="min-w-0">
          <ArticleHeader article={meta} />

          {article.affiliate && (
            <p className="mb-6 rounded-xl border border-saffron/25 bg-saffron/5 px-4 py-3 text-small text-gray-700">
              This article contains affiliate links. We may earn a commission at no
              extra cost to you.
            </p>
          )}

          {article.sponsored && (
            <p className="mb-6 rounded-xl border border-mist bg-mist/60 px-4 py-3 text-small text-gray-700">
              Sponsored content — opinions remain our own.
            </p>
          )}

          <div className="mx-auto max-w-2xl">
            <ArticleBody content={content} />
          </div>

          {article.authorBio && (
            <aside className="mx-auto mt-10 max-w-2xl rounded-2xl border border-mist/60 bg-cream/60 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-xs font-bold text-white shadow-soft">
                  {article.author.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="mb-1 font-semibold text-forest">{article.author}</p>
                  <p className="text-small leading-relaxed text-gray-600">{article.authorBio}</p>
                </div>
              </div>
            </aside>
          )}

          {article.lastUpdated && article.lastUpdated !== article.date && (
            <p className="mx-auto mt-6 max-w-2xl text-small text-gray-500">
              Last updated: {formatDate(article.lastUpdated)}
            </p>
          )}

          <div className="mx-auto max-w-2xl">
            <RelatedArticles articles={related} />
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TableOfContents items={toc} />
          </div>
        </aside>
      </div>

      {NEWSLETTER_ENABLED && (
        <div className="mt-12">
          <NewsletterBanner />
        </div>
      )}
    </article>
  )
}
