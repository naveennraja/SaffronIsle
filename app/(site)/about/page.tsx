import type { Metadata } from 'next'
import { SITE } from '@/lib/site-config'
import { getSiteUrl } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Saffron Isle — guides and stories for Indians building a life in Ireland.',
  alternates: { canonical: `${getSiteUrl()}/about` },
}

const CONTRIBUTORS = [
  {
    name: 'Naveen Raja',
    initials: 'NR',
    role: 'Founder & writer',
    bio: 'Moved from Chennai to Dublin in 2022. Writes about visas, admin, and settling in.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero header */}
      <section className="relative overflow-hidden border-b border-mist/60 bg-hero-mesh py-14 md:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream/80 via-cream/40 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-emerald/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-saffron/25 bg-white/70 px-4 py-1.5 text-label font-semibold uppercase tracking-widest text-saffron-dark shadow-soft backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-saffron" aria-hidden />
            Our story
          </p>
          <h1 className="mb-4 font-serif text-h1 text-forest">
            About Saffron Isle
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-forest/70">
            {SITE.tagline}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-h2 text-forest">Our story</h2>
          <div className="space-y-4 text-body leading-relaxed text-gray-700">
            <p>
              Saffron Isle started when a few of us — Indians who had recently
              landed in Ireland — realised how scattered good advice was. Visa
              forums, random Reddit threads, WhatsApp groups with conflicting
              answers. We wanted one place that felt like a friend who had
              already done the hard parts.
            </p>
            <p>
              What began as shared notes between friends became this site:
              practical guides, honest stories, and a community for anyone
              making the move from India to Ireland.
            </p>
          </div>
        </section>

        <section className="mb-12 rounded-2xl border border-emerald/15 bg-gradient-to-br from-emerald-light/30 to-white p-8">
          <h2 className="mb-3 font-serif text-h2 text-forest">Our mission</h2>
          <p className="text-body leading-relaxed text-gray-700">
            To help every Indian feel at home in Ireland — with clear,
            trustworthy information on visas, work, housing, food, and
            community. No gatekeeping, no fluff. Just what we wish we had on
            day one.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-serif text-h2 text-forest">
            Who writes here
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {CONTRIBUTORS.map((person) => (
              <div
                key={person.name}
                className="surface-elevated flex gap-4 p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-sm font-bold text-white shadow-soft">
                  {person.initials}
                </div>
                <div>
                  <h3 className="mb-0.5 font-serif text-h3 text-forest">
                    {person.name}
                  </h3>
                  <p className="mb-2 text-label uppercase tracking-widest text-saffron-dark">
                    {person.role}
                  </p>
                  <p className="text-small leading-relaxed text-gray-600">
                    {person.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-mist/60 bg-white p-8 shadow-soft">
          <h2 className="mb-3 font-serif text-h2 text-forest">Contact</h2>
          <p className="text-body text-gray-700">
            Questions, corrections, or story ideas? Email us at{' '}
            <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
          </p>
        </section>
      </div>
    </>
  )
}
