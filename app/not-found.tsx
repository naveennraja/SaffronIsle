import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { NotFoundContent } from '@/components/layout/NotFoundContent'

/**
 * The 404 page, for both unmatched URLs and notFound() thrown inside the site.
 *
 * It renders the navbar and footer itself rather than inheriting them. Chrome
 * lives in app/(site)/layout.tsx so that /admin does not get it, but this file
 * sits above that group — and an `app/(site)/not-found.tsx` does not pick the
 * group layout up either (verified: notFound() from an unknown article slug
 * still resolved to the root boundary). Without these two imports a visitor who
 * mistypes a URL lands on a page with no way to navigate anywhere.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main>
        <NotFoundContent />
      </main>
      <Footer />
    </>
  )
}
