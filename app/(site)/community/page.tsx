import type { Metadata } from 'next'
import { MessageCircle, Bell, Users, PenLine, Instagram } from 'lucide-react'
import { SITE, NEWSLETTER_ENABLED } from '@/lib/site-config'
import { getSiteUrl } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/ui/NewsletterForm'

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Join the Saffron Isle community — visa alerts, peer support, and connections for Indians in Ireland.',
  alternates: { canonical: `${getSiteUrl()}/community` },
}

const VALUES = [
  {
    icon: Bell,
    title: 'Visa alerts',
    description:
      'Stay updated when rules change — Stamp categories, IRP, work permits.',
    color: 'bg-emerald-light text-emerald-dark',
  },
  {
    icon: Users,
    title: 'Peer support',
    description:
      'Connect with others who understand the move — students, workers, families.',
    color: 'bg-saffron/15 text-saffron-dark',
  },
  {
    icon: MessageCircle,
    title: 'Job network',
    description:
      'Tips, referrals, and honest talk about hiring in Ireland.',
    color: 'bg-forest/10 text-forest',
  },
]

export default function CommunityPage() {
  return (
    <>
      {/* Hero header */}
      <section className="relative overflow-hidden border-b border-mist/60 bg-hero-mesh py-16 md:py-24">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream/80 via-cream/40 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-saffron/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-emerald/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald/20 bg-white/70 px-4 py-1.5 text-label font-semibold uppercase tracking-widest text-emerald-dark shadow-soft backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
            Community
          </p>
          <h1 className="mb-4 font-serif text-h1 text-forest md:text-display">
            You&apos;re not alone in this
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-forest/70">
            From one home to another — connect with Indians who&apos;ve navigated
            the same roads, forms, and foggy mornings.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 lg:py-16">
        {/* Values */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="surface-elevated p-6">
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="mb-2 font-serif text-h3 text-forest">{title}</h2>
              <p className="text-small leading-relaxed text-forest/65">
                {description}
              </p>
            </div>
          ))}
        </div>

        {/* Instagram */}
        <div className="relative mb-12 overflow-hidden rounded-3xl bg-forest px-8 py-12 text-center shadow-card md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-saffron/20 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald/15 blur-2xl"
            aria-hidden
          />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron/20 text-saffron">
              <Instagram className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="mb-3 font-serif text-h2 text-saffron">
              Follow us on Instagram
            </h2>
            <p className="mx-auto mb-8 max-w-sm text-gray-300">
              Quick updates, community stories, and local tips — follow
              @saffronisle_ireland for free.
            </p>
            <Button
              href={SITE.social.instagram}
              external
              variant="secondary"
              size="lg"
              className="border border-white/20 bg-white/10 text-cream hover:bg-white/20"
            >
              Follow on Instagram
            </Button>
          </div>
        </div>

        {/* Newsletter */}
        {NEWSLETTER_ENABLED && (
          <div className="mb-12 rounded-3xl border border-emerald/20 bg-gradient-to-br from-emerald-light/40 via-white to-white px-8 py-10 md:px-12">
            <div className="mx-auto max-w-md text-center">
              <h2 className="mb-3 font-serif text-h2 text-forest">Newsletter</h2>
              <p className="mb-6 text-forest/65">
                Visa updates and weekly tips, straight to your inbox.
              </p>
              <NewsletterForm />
              <p className="mt-3 text-small text-forest/40">
                No spam. Unsubscribe any time.
              </p>
            </div>
          </div>
        )}

        {/* Story submission */}
        <div className="rounded-3xl border border-saffron/25 bg-white px-8 py-10 text-center shadow-soft md:px-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron/10 text-saffron-dark">
            <PenLine className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mb-2 font-serif text-h2 text-forest">
            Share your story with us
          </h2>
          <p className="mx-auto mb-8 max-w-sm text-forest/65">
            Bought a house? Started a business? Survived your first Irish
            winter? We want to hear it.
          </p>
          <Button href={SITE.storySubmissionFormUrl} external variant="secondary" size="lg">
            Submit your story
          </Button>
        </div>
      </div>
    </>
  )
}
