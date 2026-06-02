import Link from 'next/link'
import { Quote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { ArticleMeta } from '@/lib/types'

interface CommunityStripProps {
  stories: ArticleMeta[]
}

export function CommunityStrip({ stories }: CommunityStripProps) {
  const quotes =
    stories.length > 0
      ? stories.slice(0, 3).map((s) => ({
          text: s.description,
          author: s.author,
          slug: s.slug,
          title: s.title,
        }))
      : [
          {
            text: 'Moving to Ireland changed everything — the community here made it feel like home.',
            author: 'Saffron Isle reader',
            slug: '',
            title: '',
          },
        ]

  return (
    <section className="relative overflow-hidden bg-forest py-14 md:py-20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(232,149,46,0.15)_0%,_transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionHeader
          eyebrow="Stories"
          title="Community voices"
          description="Real journeys from Indians building a life in Ireland."
          href="/category/community-stories"
          linkLabel="More stories"
          dark
        />
        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map((q, i) => (
            <blockquote
              key={i}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-saffron/30 hover:bg-white/10 md:p-7"
            >
              <Quote
                className="mb-4 h-8 w-8 text-saffron/50"
                aria-hidden
              />
              <p className="mb-6 flex-1 font-serif text-lg leading-relaxed text-cream/95">
                &ldquo;{q.text}&rdquo;
              </p>
              <footer className="border-t border-white/10 pt-4">
                <cite className="not-italic text-small font-medium text-saffron-light">
                  {q.author}
                </cite>
                {q.slug && (
                  <Link
                    href={`/articles/${q.slug}`}
                    className="mt-2 inline-flex items-center gap-1 text-small font-medium text-saffron-light no-underline transition-colors hover:text-cream"
                  >
                    Read: {q.title} →
                  </Link>
                )}
              </footer>
            </blockquote>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button
            href="/category/community-stories"
            variant="secondary"
            size="lg"
            className="border border-white/20 bg-white/10 text-cream hover:bg-white/20"
          >
            Explore community stories
          </Button>
        </div>
      </div>
    </section>
  )
}
