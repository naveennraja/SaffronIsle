import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="mb-1 font-serif text-[7rem] font-bold leading-none text-mist">
        404
      </p>
      <p className="mb-2 text-label font-semibold uppercase tracking-widest text-saffron-dark">
        Page not found
      </p>
      <h1 className="mb-4 font-serif text-h2 text-forest">
        We lost this one in the fog
      </h1>
      <p className="mb-8 leading-relaxed text-gray-500">
        The page you are looking for might have moved or does not exist yet.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button href="/">Back to home</Button>
        <Button href="/articles" variant="outline">
          Browse articles
        </Button>
      </div>
      <Link href="/search" className="mt-6 text-small">
        Try searching instead
      </Link>
    </div>
  )
}
