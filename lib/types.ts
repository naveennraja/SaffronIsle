export interface ArticleFrontmatter {
  title: string
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
