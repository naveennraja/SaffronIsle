import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

/**
 * Chrome for the public site.
 *
 * This lives here rather than in the root layout so that /admin does not
 * inherit it — a publishing tool has no business wearing the public navbar and
 * footer, and the (site) route group existed for exactly this split without
 * ever being given a layout to make it real.
 *
 * Route groups do not affect URLs, so every page in here keeps its path.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}
