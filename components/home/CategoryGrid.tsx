import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  VISIBLE_CATEGORIES,
  type CategoryColor,
} from '@/lib/categories'
import { getArticleCountByCategory } from '@/lib/articles'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { cn } from '@/lib/utils'

const iconStyles: Record<CategoryColor, string> = {
  emerald: 'bg-emerald-light text-emerald-dark',
  saffron: 'bg-saffron/15 text-saffron-dark',
  gold: 'bg-gold/20 text-amber-900',
  forest: 'bg-forest/10 text-forest',
  mist: 'bg-mist text-forest/70',
}

const hoverBorder: Record<CategoryColor, string> = {
  emerald: 'hover:border-emerald/40 hover:shadow-glow',
  saffron: 'hover:border-saffron/40',
  gold: 'hover:border-gold/50',
  forest: 'hover:border-forest/30',
  mist: 'hover:border-mist',
}

export function CategoryGrid() {
  return (
    <section className="border-y border-mist/50 bg-white/60 py-14 backdrop-blur-sm md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          eyebrow="Explore"
          title="Browse by topic"
          description="Everything you need — from visas to weekend trips."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {VISIBLE_CATEGORIES.sort((a, b) => a.priority - b.priority).map((category) => {
            const count = getArticleCountByCategory(category.slug)

            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className={cn(
                  'group flex flex-col rounded-2xl border border-mist/70 bg-white p-5 no-underline shadow-soft transition-all duration-300 lg:p-6',
                  hoverBorder[category.color]
                )}
              >
                <div
                  className={cn(
                    'mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
                    iconStyles[category.color]
                  )}
                >
                  <CategoryIcon name={category.icon} className="h-6 w-6" />
                </div>
                <h3 className="mb-1 font-serif text-h3 text-forest">
                  {category.label}
                </h3>
                <p className="mb-3 text-label text-forest/70">
                  {count} {count === 1 ? 'article' : 'articles'}
                </p>
                <p className="mb-4 line-clamp-2 flex-1 text-small leading-relaxed text-forest/70">
                  {category.description}
                </p>
                <span className="inline-flex items-center gap-1 text-label font-semibold uppercase tracking-wider text-emerald opacity-0 transition-opacity group-hover:opacity-100">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
