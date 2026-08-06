import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SITE } from '@/lib/site-config'
import { getSiteUrl } from '@/lib/utils'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    url: getSiteUrl(),
    siteName: SITE.name,
    locale: 'en_IE',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // data-scroll-behavior tells Next to suppress the global
    // `scroll-behavior: smooth` (app/globals.css) during route changes, so
    // navigation jumps to the top instead of animating. Next 15 did this
    // implicitly; from Next 16 it is opt-in.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${lora.variable}`}
    >
      {/* Navbar and Footer live in app/(site)/layout.tsx, not here, so that
          /admin renders without the public site's chrome. */}
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
