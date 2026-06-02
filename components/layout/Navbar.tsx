'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MobileMenu } from './MobileMenu'

const NAV_LINKS = [
  { href: '/category/visa', label: 'Visa' },
  { href: '/category/student-life', label: 'Student life' },
  { href: '/category/food-groceries', label: 'Food' },
  { href: '/category/community-stories', label: 'Stories' },
  { href: '/community', label: 'Community' },
]

export function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isHome = pathname === '/'

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const transparent = isHome && !scrolled

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 transition-colors duration-300',
          transparent
            ? 'bg-cream/40 backdrop-blur-md'
            : 'border-b border-mist/40 bg-white/90 shadow-soft backdrop-blur-lg'
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:h-16">
          <Link
            href="/"
            className="flex items-center gap-2 no-underline"
            aria-label="Saffron Isle home"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-sm font-bold text-white shadow-soft"
              aria-hidden
            >
              SI
            </span>
            <span className="font-serif text-lg font-semibold text-forest lg:text-xl">
              Saffron Isle
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 lg:flex"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'text-small font-medium no-underline transition-colors',
                    active
                      ? 'rounded-lg bg-emerald-light/80 px-3 py-1.5 text-emerald-dark'
                      : 'rounded-lg px-3 py-1.5 text-forest/65 hover:bg-mist/80 hover:text-forest'
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-forest no-underline hover:bg-mist"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Link>
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-forest hover:bg-mist lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
