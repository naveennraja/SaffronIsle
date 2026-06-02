import type { Metadata } from 'next'
import { getAllArticles } from '@/lib/articles'
import { SearchBar } from '@/components/ui/SearchBar'
import { ArticlesListingClient } from './ArticlesListingClient'

export const metadata: Metadata = {
  title: 'All articles',
  description:
    'Browse every guide on visas, student life, food, work, housing, and more for Indians in Ireland.',
}

export default function ArticlesPage() {
  const articles = getAllArticles()

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <h1 className="mb-2 font-serif text-h1 text-forest">All articles</h1>
        <p className="mb-6 text-body text-forest/60">
          Practical guides and stories for Indians in Ireland.
        </p>
        <SearchBar className="max-w-lg" />
      </header>
      <ArticlesListingClient articles={articles} />
    </div>
  )
}
