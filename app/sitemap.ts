import type { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/articles'
import { VISIBLE_CATEGORIES } from '@/lib/categories'
import { getSiteUrl } from '@/lib/utils'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const articles = getAllArticles()

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/articles`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/community`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/search`, changeFrequency: 'monthly', priority: 0.4 },
  ]

  const categoryPages: MetadataRoute.Sitemap = VISIBLE_CATEGORIES.map(
    ({ slug }) => ({
      url: `${base}/category/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
  )

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${base}/articles/${article.slug}`,
    lastModified: new Date(article.lastUpdated ?? article.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...articlePages]
}
