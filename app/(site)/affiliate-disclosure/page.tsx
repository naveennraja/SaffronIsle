import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/utils'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Affiliate disclosure',
  description: 'How Saffron Isle uses affiliate links and earns commissions.',
  alternates: { canonical: `${getSiteUrl()}/affiliate-disclosure` },
}

export default function AffiliateDisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      <h1 className="mb-6 font-serif text-h1 text-forest">Affiliate disclosure</h1>
      <div className="prose-saffron space-y-4 text-body text-gray-700">
        <p>
          Some articles on Saffron Isle contain affiliate links. If you click a link and
          sign up or make a purchase, we may earn a small commission at no extra cost to
          you.
        </p>
        <p>
          We only recommend services we believe are genuinely useful for Indians living in
          or moving to Ireland. Affiliate income helps us keep the site free and updated.
        </p>
        <p>
          Articles marked with an affiliate disclosure banner at the top contain one or
          more such links. Our editorial opinions are always our own.
        </p>
        <p>
          Questions? Contact us at{' '}
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>
      </div>
    </div>
  )
}
