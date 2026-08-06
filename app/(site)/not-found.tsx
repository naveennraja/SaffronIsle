import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { NotFoundContent } from '@/components/layout/NotFoundContent'

/**
 * Catches notFound() thrown inside the public site — an unknown article or
 * category slug.
 *
 * Renders the chrome itself rather than inheriting it. A not-found boundary
 * replaces the segment *and* the layouts above it, so this does not sit inside
 * app/(site)/layout.tsx and would otherwise show a bare page with no navigation.
 * Verified: no duplicate navbar or footer in the output.
 */
export default function SiteNotFound() {
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
