import type { ArticleMeta } from '@/lib/types'

/**
 * Turns published articles into the document blocks Ask Saffron Isle answers
 * from.
 *
 * With a handful of articles there is no retrieval step: every article goes to
 * the model on every question, as a cached prefix. That only stays cheap while
 * the prefix is byte-identical between requests, so ordering is by slug (not
 * by date, which shifts whenever an article is published) and nothing
 * request-specific is ever mixed in.
 *
 * Kept free of `server-only` and filesystem access so the tests can build
 * documents from plain objects.
 */

/** What the route needs to turn a citation's document_index back into a link. */
export interface AskDocument {
  slug: string
  title: string
  category: string
}

export interface ArticleForAsk extends Pick<ArticleMeta, 'slug' | 'title' | 'category'> {
  content: string
}

/**
 * MDX that only means something to the renderer. Images carry nothing the
 * model can answer from, and their attribute soup would otherwise be quotable
 * as if it were prose.
 */
export function mdxToPlainText(mdx: string): string {
  return mdx
    .replace(/<ArticleImage\b[^>]*\/>/g, '')
    .replace(/<\/?(Callout|ChecklistItem|AffiliateCTA)\b[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function buildAskDocuments(articles: ArticleForAsk[]): {
  documents: AskDocument[]
  blocks: {
    type: 'document'
    source: { type: 'text'; media_type: 'text/plain'; data: string }
    title: string
    context: string
    citations: { enabled: true }
    cache_control?: { type: 'ephemeral' }
  }[]
} {
  const sorted = [...articles].sort((a, b) => a.slug.localeCompare(b.slug))

  const documents = sorted.map(({ slug, title, category }) => ({ slug, title, category }))

  const blocks = sorted.map((article, i) => ({
    type: 'document' as const,
    source: {
      type: 'text' as const,
      media_type: 'text/plain' as const,
      data: mdxToPlainText(article.content),
    },
    title: article.title,
    context: `Saffron Isle article. Category: ${article.category}. URL: /articles/${article.slug}`,
    citations: { enabled: true as const },
    // One breakpoint after the last article caches the system prompt and the
    // whole corpus together; only the question after it is new each time.
    ...(i === sorted.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }))

  return { documents, blocks }
}
