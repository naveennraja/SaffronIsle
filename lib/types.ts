export interface ArticleFrontmatter {
  title: string
  /**
   * Overrides the <title> tag and OpenGraph title. The on-page heading always
   * uses `title` — this exists so a search result can read differently from the
   * article itself, which is usually longer and more keyword-led.
   */
  metaTitle?: string
  description: string
  date: string
  lastUpdated?: string
  category: string
  tags?: string[]
  author: string
  authorBio?: string
  coverImage: string
  coverAlt: string
  city?: 'dublin' | 'cork' | 'galway' | 'limerick' | 'all'
  featured?: boolean
  readTime?: number
  affiliate?: boolean
  sponsored?: boolean
}

export interface ArticleMeta extends ArticleFrontmatter {
  slug: string
  readTime: number
}

export interface Article extends ArticleMeta {
  content: string
}
