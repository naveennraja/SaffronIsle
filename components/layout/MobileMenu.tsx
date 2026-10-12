'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VISIBLE_CATEGORIES } from '@/lib/categories'

const NAV_LINKS = [
  { href: '/category/visa', label: 'Visa' },
  { href: '/category/student-life', label: 'Student life' },
  { href: '/category/food-groceries', label: 'Food' },
  { href: '/category/community-stories', label: 'Stories' },
  { href: '/community', label: 'Community' },
]

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-forest/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <nav
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 lg:hidden',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        // inert, not just aria-hidden: the closed menu is only translated
        // off-screen, so without it its links stay in the tab order.
        inert={!open}
        aria-label="Mobile navigation"
      >
        <div className="flex min-h-[56px] items-center justify-between border-b border-mist/60 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2 no-underline"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-xs font-bold text-white shadow-soft"
              aria-hidden
            >
              SI
            </span>
            <span className="font-serif text-base font-semibold text-forest">
              Saffron Isle
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-forest hover:bg-mist"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-8 pt-3">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium text-forest no-underline hover:bg-cream"
            >
              {label}
            </Link>
          ))}

          <div className="my-3 border-t border-mist" />

          <p className="px-4 pb-1 text-label font-semibold uppercase tracking-widest text-saffron-dark">
            All categories
          </p>
          {VISIBLE_CATEGORIES.map(({ slug, label }) => (
            <Link
              key={slug}
              href={`/category/${slug}`}
              onClick={onClose}
              className="flex min-h-[44px] items-center rounded-xl px-4 text-small text-gray-700 no-underline hover:bg-cream"
            >
              {label}
            </Link>
          ))}

          <Link
            href="/search"
            onClick={onClose}
            className="mt-4 flex min-h-[48px] items-center justify-center rounded-xl bg-emerald px-4 font-medium text-white no-underline transition-colors hover:bg-emerald-dark"
          >
            Search articles
          </Link>
        </div>
      </nav>
    </>
  )
}
