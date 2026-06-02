import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  href?: string
  linkLabel?: string
  className?: string
  dark?: boolean
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = 'View all',
  className,
  dark = false,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p
            className={cn(
              'mb-2 flex items-center gap-2 text-label font-semibold uppercase tracking-widest',
              dark ? 'text-saffron-light' : 'text-saffron-dark'
            )}
          >
            <span
              className={cn(
                'h-px w-8',
                dark ? 'bg-saffron/60' : 'bg-saffron'
              )}
              aria-hidden
            />
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            'font-serif text-h2',
            dark ? 'text-cream' : 'text-forest'
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'mt-2 text-body leading-relaxed',
              dark ? 'text-gray-300' : 'text-forest/65'
            )}
          >
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            'group inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-small font-medium no-underline transition-colors',
            dark
              ? 'text-saffron-light hover:text-cream'
              : 'text-emerald hover:text-emerald-dark'
          )}
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
