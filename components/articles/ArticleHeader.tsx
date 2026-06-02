import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getCategoryBySlug } from '@/lib/categories'
import { Badge } from '@/components/ui/Badge'
import { ArticleMeta } from './ArticleMeta'
import type { ArticleMeta as ArticleMetaType } from '@/lib/types'

interface ArticleHeaderProps {
  article: ArticleMetaType
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const category = getCategoryBySlug(article.category)

  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-small text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="no-underline hover:text-emerald">
              Home
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="inline h-4 w-4" />
          </li>
          <li>
            <Link
              href={`/category/${article.category}`}
              className="no-underline hover:text-emerald"
            >
              {category?.label ?? article.category}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="inline h-4 w-4" />
          </li>
          <li className="line-clamp-1 text-gray-700" aria-current="page">
            {article.title}
          </li>
        </ol>
      </nav>

      {category && (
        <div className="mb-3">
          <Badge label={category.label} color={category.color} />
        </div>
      )}

      <h1 className="mb-4 font-serif text-h1 text-forest lg:text-display">
        {article.title}
      </h1>

      <p className="mb-4 text-lg leading-relaxed text-gray-600">
        {article.description}
      </p>

      <div className="mb-6">
        <ArticleMeta article={article} />
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl bg-mist">
        <Image
          src={article.coverImage}
          alt={article.coverAlt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 896px"
        />
      </div>
    </header>
  )
}
