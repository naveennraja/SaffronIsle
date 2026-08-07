import 'server-only'

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { getCategorySlugs } from './categories'
// Plain CommonJS module, shared with the scheduling workflow script
import { isPublished } from './publish-date.js'
import { readTime } from './utils'
import type { Article, ArticleMeta, ArticleFrontmatter } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content/articles')

const REQUIRED_FIELDS: (keyof ArticleFrontmatter)[] = [
  'title',
  'description',
  'date',
  'category',
  'author',
  'coverImage',
  'coverAlt',
]

function validateFrontmatter(
  data: Record<string, unknown>,
  filePath: string
): ArticleFrontmatter {
  for (const field of REQUIRED_FIELDS) {
    if (!data[field] || typeof data[field] !== 'string') {
      throw new Error(
        `Article "${filePath}" is missing required frontmatter field: ${field}`
      )
    }
  }
  const validCategories = getCategorySlugs()
  if (!validCategories.includes(data.category as string)) {
    throw new Error(
      `Article "${filePath}" has invalid category "${data.category}". Must be one of: ${validCategories.join(', ')}`
    )
  }
  if (typeof data.title === 'string' && data.title.length > 80) {
    throw new Error(`Article "${filePath}" title exceeds 80 characters`)
  }
  if (typeof data.description === 'string' && data.description.length > 160) {
    throw new Error(`Article "${filePath}" description exceeds 160 characters`)
  }
  return data as unknown as ArticleFrontmatter
}

function getMdxFiles(): { filePath: string; category: string; slug: string }[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return []
  }

  const files: { filePath: string; category: string; slug: string }[] = []

  for (const category of getCategorySlugs()) {
    const categoryDir = path.join(CONTENT_DIR, category)
    if (!fs.existsSync(categoryDir)) continue

    const entries = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.mdx'))
    for (const file of entries) {
      files.push({
        filePath: path.join(categoryDir, file),
        category,
        slug: file.replace(/\.mdx$/, ''),
      })
    }
  }

  return files
}

function parseArticleFile(
  filePath: string,
  category: string,
  slug: string
): Article {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const fm = validateFrontmatter(data as Record<string, unknown>, filePath)
  if (fm.category !== category) {
    throw new Error(
      `Article "${filePath}" category in frontmatter (${fm.category}) does not match folder (${category})`
    )
  }

  const computedReadTime = fm.readTime ?? readTime(content)

  return {
    ...fm,
    slug,
    category,
    readTime: computedReadTime,
    content,
  }
}

function toMeta(article: Article): ArticleMeta {
  const { content: _, ...meta } = article
  return meta
}

function loadAllArticles(): Article[] {
  return getMdxFiles()
    .map(({ filePath, category, slug }) =>
      parseArticleFile(filePath, category, slug)
    )
    // Scheduled articles are filtered here, at the single point every reader
    // goes through, so listings, search, the sitemap and generateStaticParams
    // all agree. Filtering per-caller would eventually miss one and leave a
    // scheduled article reachable at its direct URL while hidden everywhere
    // else — live, but unlinked and unindexed.
    .filter((article) => isPublished(article.date))
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
}

let cache: Article[] | null = null

function getArticles(): Article[] {
  if (!cache) {
    cache = loadAllArticles()
  }
  return cache
}

export function getAllArticles(): ArticleMeta[] {
  return getArticles().map(toMeta)
}

export function getArticlesByCategory(category: string): ArticleMeta[] {
  return getAllArticles().filter((a) => a.category === category)
}

export function getArticleBySlug(slug: string): Article | null {
  const article = getArticles().find((a) => a.slug === slug)
  return article ?? null
}

export function getFeaturedArticles(limit = 3): ArticleMeta[] {
  return getAllArticles()
    .filter((a) => a.featured === true)
    .slice(0, limit)
}

export function getArticlesByCity(city: string): ArticleMeta[] {
  if (city === 'all') return getAllArticles()
  return getAllArticles().filter(
    (a) => a.city === city || a.city === 'all'
  )
}

export function getRelatedArticles(
  slug: string,
  limit = 3
): ArticleMeta[] {
  const current = getArticleBySlug(slug)
  if (!current) return []

  return getAllArticles()
    .filter((a) => a.category === current.category && a.slug !== slug)
    .slice(0, limit)
}

export function getAllArticleSlugs(): string[] {
  return getArticles().map((a) => a.slug)
}

export function getArticleCountByCategory(category: string): number {
  return getArticlesByCategory(category).length
}
