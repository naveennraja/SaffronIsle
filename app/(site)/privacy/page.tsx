import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/utils'
import { ASK_ENABLED, SITE } from '@/lib/site-config'
import { insightsEnabled } from '@/lib/ask/store'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'Privacy policy for Saffron Isle — how we handle your data.',
  alternates: { canonical: `${getSiteUrl()}/privacy` },
}

export default function PrivacyPage() {
  const savesQuestions = insightsEnabled()
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
        {/* Only describe the assistant where readers can actually use it. */}
        {ASK_ENABLED && (
          <>
            <h2 className="font-serif text-h3 text-forest">Ask Saffron Isle</h2>
            <p>
              When you use the Ask button, your question is sent to Anthropic, the company
              that makes the Claude AI model, so it can write an answer from our articles.
              Anthropic processes the request to return the answer, and under{' '}
              <a
                href="https://www.anthropic.com/legal/commercial-terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anthropic&apos;s Commercial Terms
              </a>{' '}
              it may not use it to train its models.
            </p>
            {savesQuestions ? (
              <p>
                To learn what readers need, we save each question anonymously: personal
                details such as names, email addresses, phone numbers and ID numbers are
                removed before it is saved, and we never store your IP address or anything
                else that identifies you. We keep the question, whether our articles could
                answer it, and which article was used. Saved questions are stored in the EU
                and deleted automatically after 90 days; after that we keep only counts of
                how often each topic was asked.
              </p>
            ) : (
              <p>
                Saffron Isle does not store your question or the answer, and does not link
                them to you.
              </p>
            )}
            <p>
              Please don&apos;t include personal details such as your name, passport, IRP or
              PPS number, phone number or email address in a question. Nothing in the answer
              is legal or immigration advice — always check official sources before you act.
            </p>
          </>
        )}
        <h2 className="font-serif text-h3 text-forest">Contact</h2>
        <p>
          For privacy questions, email{' '}
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>
      </div>
    </div>
  )
}
