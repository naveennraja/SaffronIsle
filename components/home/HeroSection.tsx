import Link from 'next/link'
import { ArrowRight, MapPin, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VISIBLE_CATEGORIES } from '@/lib/categories'

const HIGHLIGHTS = [
  { icon: BookOpen, label: 'Practical guides', value: '6+ topics' },
  { icon: MapPin, label: 'City-specific tips', value: 'Dublin & beyond' },
  { icon: Users, label: 'Community stories', value: 'Real voices' },
]

export function HeroSection() {
  const topCategories = VISIBLE_CATEGORIES.slice(0, 4)

  return (
    <section className="relative overflow-hidden border-b border-mist/60 bg-hero-mesh">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream/80 via-cream/40 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-emerald/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-saffron/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-white/70 px-4 py-1.5 text-label font-semibold uppercase tracking-widest text-emerald-dark shadow-soft backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
              From one home to another
            </p>
            <h1 className="mb-5 max-w-xl font-serif text-h1 leading-tight text-forest md:text-display">
              Your guide to life in{' '}
              <span className="relative whitespace-nowrap">
                Ireland
                <span
                  className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-gradient-to-r from-saffron via-saffron-light to-emerald/60"
                  aria-hidden
                />
              </span>
            </h1>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-forest/70">
              From visa to first flat — honest guides, local tips, and stories
              from Indians who&apos;ve made the move.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/category/visa" variant="primary" size="lg">
                Read the visa guide
              </Button>
              <Button href="/articles" variant="outline" size="lg">
                Browse all articles
              </Button>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-3 border-t border-mist/80 pt-8 sm:gap-6">
              {HIGHLIGHTS.map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <Icon
                      className="mb-2 h-5 w-5 text-emerald"
                      aria-hidden
                    />
                    <p className="font-serif text-h3 text-forest">{value}</p>
                    <p className="text-label text-forest/55">{label}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-fade-up lg:pl-4" style={{ animationDelay: '0.1s' }}>
            <div className="surface-card relative overflow-hidden p-6 md:p-8">
              <div
                className="absolute right-0 top-0 h-32 w-32 rounded-bl-[4rem] bg-gradient-to-bl from-saffron/20 to-transparent"
                aria-hidden
              />
              <p className="mb-1 text-label font-semibold uppercase tracking-widest text-saffron-dark">
                Start here
              </p>
              <p className="mb-6 font-serif text-h3 text-forest">
                Most-read paths for newcomers
              </p>
              <ul className="space-y-2">
                {topCategories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/category/${cat.slug}`}
                      className="group flex items-center justify-between rounded-xl border border-mist/50 bg-cream/40 px-4 py-3.5 text-body font-medium text-forest no-underline transition-all hover:border-emerald/25 hover:bg-emerald-light/30 hover:shadow-soft"
                    >
                      <span>{cat.label}</span>
                      <ArrowRight className="h-4 w-4 text-emerald opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/articles"
                className="mt-5 inline-flex items-center gap-1 text-small font-medium text-emerald no-underline hover:text-emerald-dark"
              >
                See all categories
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
