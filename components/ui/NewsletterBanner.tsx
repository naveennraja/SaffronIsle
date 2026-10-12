import { Mail } from 'lucide-react'
import { NewsletterForm } from '@/components/ui/NewsletterForm'

export function NewsletterBanner() {
  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-emerald/15 bg-gradient-to-br from-emerald via-emerald-dark to-forest px-6 py-10 shadow-glow md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-saffron/20 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-cream backdrop-blur-sm">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="mb-2 font-serif text-h2 text-cream">
              Stay in the loop
            </h2>
            <p className="mb-8 text-body leading-relaxed text-emerald-light/90">
              Visa updates, weekly tips, and community news — straight to your
              inbox.
            </p>
            <NewsletterForm
              formClassName="[&_input]:border-white/20 [&_input]:bg-white/95 [&_button]:bg-saffron [&_button]:text-forest [&_button]:hover:bg-saffron-light"
            />
            <p className="mt-4 text-small text-emerald-light/80">
              No spam. Unsubscribe any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
