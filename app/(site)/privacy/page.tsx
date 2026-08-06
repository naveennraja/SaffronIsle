import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'Privacy policy for Saffron Isle — how we handle your data.',
  alternates: { canonical: `${getSiteUrl()}/privacy` },
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      <h1 className="mb-6 font-serif text-h1 text-forest">Privacy policy</h1>
      <div className="space-y-4 text-body text-gray-700">
        <p>
          Saffron Isle respects your privacy. This policy explains what information we
          collect and how we use it.
        </p>
        <h2 className="font-serif text-h3 text-forest">Newsletter</h2>
        <p>
          When you subscribe to our newsletter, we collect your email address to send you
          updates. You can unsubscribe at any time via the link in any email.
        </p>
        <h2 className="font-serif text-h3 text-forest">Analytics</h2>
        <p>
          We use privacy-friendly analytics (Vercel Analytics) to understand how visitors
          use the site. No personally identifiable information is sold to third parties.
        </p>
        <h2 className="font-serif text-h3 text-forest">Contact</h2>
        <p>
          For privacy questions, email{' '}
          <a href="mailto:hello@saffronisle.ie">hello@saffronisle.ie</a>.
        </p>
      </div>
    </div>
  )
}
