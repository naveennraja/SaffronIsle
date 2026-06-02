import Link from 'next/link'
import { Instagram, Youtube, MessageCircle } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { SITE } from '@/lib/site-config'
import { NewsletterForm } from '@/components/ui/NewsletterForm'

export function Footer() {
  return (
    <footer className="border-t-4 border-saffron bg-forest text-gray-200">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-sm font-bold text-white shadow-soft">
                SI
              </span>
              <span className="font-serif text-xl font-semibold text-white">
                Saffron Isle
              </span>
            </div>
            <p className="mb-5 text-small leading-relaxed text-gray-400">
              {SITE.tagline}
            </p>
            <div className="flex gap-1">
              <a
                href={SITE.social.instagram}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-400 no-underline transition-colors hover:bg-white/10 hover:text-saffron"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={SITE.social.youtube}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-400 no-underline transition-colors hover:bg-white/10 hover:text-saffron"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href={SITE.social.whatsapp}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-400 no-underline transition-colors hover:bg-white/10 hover:text-saffron"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-label font-semibold uppercase tracking-widest text-saffron">
              Explore
            </h3>
            <ul className="space-y-2">
              {CATEGORIES.map(({ slug, label }) => (
                <li key={slug}>
                  <Link
                    href={`/category/${slug}`}
                    className="text-small text-gray-400 no-underline transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-label font-semibold uppercase tracking-widest text-saffron">
              Information
            </h3>
            <ul className="space-y-2 text-small">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 no-underline transition-colors hover:text-white"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/community"
                  className="text-gray-400 no-underline transition-colors hover:text-white"
                >
                  Community
                </Link>
              </li>
              <li>
                <a
                  href={SITE.storySubmissionFormUrl}
                  className="text-gray-400 no-underline transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Submit your story
                </a>
              </li>
              <li>
                <Link
                  href="/affiliate-disclosure"
                  className="text-gray-400 no-underline transition-colors hover:text-white"
                >
                  Affiliate disclosure
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-label font-semibold uppercase tracking-widest text-saffron">
              Newsletter
            </h3>
            <p className="mb-4 text-small leading-relaxed text-gray-400">
              Visa updates and weekly tips.
            </p>
            <NewsletterForm compact />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-8 text-small text-gray-500 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Saffron Isle</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/privacy"
              className="text-gray-500 no-underline transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="/affiliate-disclosure"
              className="text-gray-500 no-underline transition-colors hover:text-white"
            >
              Affiliate Disclosure
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
