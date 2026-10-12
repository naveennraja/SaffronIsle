import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getCategoryBySlug } from '@/lib/categories'
import type { CategoryColor } from '@/lib/categories'
import { Badge } from '@/components/ui/Badge'
import { ArticleMeta } from './ArticleMeta'
import type { ArticleMeta as ArticleMetaType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ArticleCardProps {
  article: ArticleMetaType
  size?: 'default' | 'featured'
}

const iconRing: Record<CategoryColor, string> = {
  emerald: 'ring-emerald/20',
  saffron: 'ring-saffron/25',
  gold: 'ring-gold/30',
  forest: 'ring-forest/15',
  mist: 'ring-mist',
}

export function ArticleCard({ article, size = 'default' }: ArticleCardProps) {
  const category = getCategoryBySlug(article.category)

  return (
    <Link
      href={`/articles/${article.slug}`}
      className={cn(
        'group flex flex-col no-underline',
        size === 'featured' && 'min-w-[300px] shrink-0 snap-start lg:min-w-0'
      )}
    >
      <article
        className={cn(
          'surface-elevated flex h-full flex-col overflow-hidden',
          size === 'featured' && 'lg:flex-col'
        )}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-mist">
          <Image
            src={article.coverImage}
            alt={article.coverAlt}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes={
              size === 'featured'
                ? '(max-width: 768px) 85vw, 33vw'
                : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
            }
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-forest/50 via-forest/5 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80"
            aria-hidden
          />
          <span
            className={cn(
              'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-forest shadow-soft transition-all duration-300 group-hover:bg-emerald group-hover:text-white',
              iconRing[category?.color ?? 'emerald']
            )}
            aria-hidden
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5 md:p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            {category && (
              <Badge label={category.label} color={category.color} />
            )}
            {article.city && article.city !== 'all' && (
              <Badge label={article.city} color="mist" />
            )}
          </div>
          <h3
            className={cn(
              'mb-2 line-clamp-2 font-serif text-forest transition-colors group-hover:text-emerald-dark',
              size === 'featured' ? 'text-h2' : 'text-h3'
            )}
          >
            {article.title}
          </h3>
          <p className="mb-4 line-clamp-2 flex-1 text-small leading-relaxed text-forest/70">
            {article.description}
          </p>
          <ArticleMeta article={article} />
        </div>
      </article>
    </Link>
  )
}
