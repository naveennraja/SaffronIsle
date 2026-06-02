import 'server-only'

import Fuse from 'fuse.js'
import { getAllArticles } from './articles'
import type { ArticleMeta } from './types'

export function searchArticles(query: string): ArticleMeta[] {
  if (!query.trim()) return getAllArticles()

  const fuse = new Fuse(getAllArticles(), {
    keys: ['title', 'description', 'tags'],
    threshold: 0.4,
    includeScore: true,
  })

  return fuse.search(query).map((r) => r.item)
}
