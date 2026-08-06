import { NotFoundContent } from '@/components/layout/NotFoundContent'

/**
 * Catches notFound() thrown inside the public site — an unknown article or
 * category slug.
 *
 * Renders no chrome of its own: this sits inside app/(site)/layout.tsx, which
 * already supplies the navbar, <main> and footer. Adding them here shipped a
 * 404 with two of each.
 *
 * The root app/not-found.tsx is the opposite case — it sits above this group,
 * inherits nothing, and so renders its own.
 */
export default function SiteNotFound() {
  return <NotFoundContent />
}
