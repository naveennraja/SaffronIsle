// @ts-check
/**
 * Converts .docx files from drafts/ into MDX articles.
 *
 * Filename convention: category__slug.docx
 * Example: visa__stamp-4-guide.docx
 *
 * Valid categories: visa, student-life, food-groceries, work-careers,
 *                   finances, housing, explore-ireland, community-stories
 */

const fs = require('fs')
const path = require('path')
const { convertDocx } = require('../lib/docx-to-mdx.js')

const DRAFTS_DIR = path.join(process.cwd(), 'drafts')
const PROCESSED_DIR = path.join(DRAFTS_DIR, 'processed')
const CONTENT_DIR = path.join(process.cwd(), 'content', 'articles')
const PUBLISH_LOG = path.join(process.cwd(), 'drafts', 'publish-log.md')

const VALID_CATEGORIES = [
  'visa',
  'student-life',
  'food-groceries',
  'work-careers',
  'finances',
  'housing',
  'explore-ireland',
  'community-stories',
]

function slugToTitle(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function buildFrontmatter({ title, slug, category, description, date }) {
  return `---
title: "${title}"
description: "${description}"
date: "${date}"
category: "${category}"
author: "Nethra Bhaskar"
coverImage: "/images/articles/${slug}.jpg"
coverAlt: "${title}"
readTime: 5
featured: false
---`
}

async function processFile(filePath) {
  const filename = path.basename(filePath, '.docx')
  const parts = filename.split('__')

  if (parts.length !== 2) {
    console.error(`❌  "${filename}.docx" — name must be category__slug.docx`)
    return null
  }

  const [category, slug] = parts

  if (!VALID_CATEGORIES.includes(category)) {
    console.error(
      `❌  "${filename}.docx" — unknown category "${category}"\n   Valid: ${VALID_CATEGORIES.join(', ')}`
    )
    return null
  }

  // Same rule the web uploader enforces. The slug becomes a path segment for
  // both the .mdx and the extracted images, so it must not escape its folder.
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error(
      `❌  "${filename}.docx" — slug "${slug}" must be lowercase letters, numbers and hyphens only`
    )
    return null
  }

  const outputPath = path.join(CONTENT_DIR, category, `${slug}.mdx`)

  if (fs.existsSync(outputPath)) {
    console.log(`⏭️   Skipping "${filename}" — article already exists`)
    return null
  }

  console.log(`📄  Converting: ${filename}.docx …`)

  const { markdown, description, images, warnings, messages } = await convertDocx({
    path: filePath,
    slug,
  })

  if (messages.length > 0) {
    messages.forEach((m) => console.warn(`    ⚠️  ${m.message}`))
  }
  warnings.forEach((w) => console.warn(`    ⚠️  ${w}`))

  const title = slugToTitle(slug)
  const finalDescription = description || `${title} — a guide for Indians in Ireland.`
  const date = new Date().toISOString().split('T')[0]

  const content = `${buildFrontmatter({ title, slug, category, description: finalDescription, date })}\n\n${markdown}\n`

  const categoryDir = path.join(CONTENT_DIR, category)
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true })
  }

  // Images embedded in the document, written where the MDX now references them.
  for (const img of images) {
    const dest = path.join(process.cwd(), img.path)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, img.buffer)
  }

  fs.writeFileSync(outputPath, content, 'utf-8')
  console.log(
    `✅  Created: content/articles/${category}/${slug}.mdx` +
      (images.length > 0 ? ` (+${images.length} image${images.length === 1 ? '' : 's'})` : '')
  )

  return { filename, category, slug, outputPath }
}

async function main() {
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true })
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true })

  const files = fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith('.docx') && !f.startsWith('~$'))
    .map((f) => path.join(DRAFTS_DIR, f))

  if (files.length === 0) {
    console.log('📭  No new drafts found in drafts/')
    return
  }

  console.log(`📬  Found ${files.length} draft file(s)\n`)

  const done = []

  for (const filePath of files) {
    const result = await processFile(filePath)
    if (result) {
      done.push(result)
      const dest = path.join(PROCESSED_DIR, path.basename(filePath))
      fs.renameSync(filePath, dest)
      console.log(`    → moved to drafts/processed/\n`)
    }
  }

  if (done.length === 0) {
    console.log('\nNothing to publish.')
    return
  }

  // Append to publish log
  const today = new Date().toISOString().split('T')[0]
  const logHeader = !fs.existsSync(PUBLISH_LOG)
    ? '# Publish Log\n\nAll articles published through the drafts pipeline.\n\n| Date | Title | Category | Slug |\n|---|---|---|---|\n'
    : ''

  const logLines = done
    .map((a) => `| ${today} | ${slugToTitle(a.slug)} | ${a.category} | ${a.slug} |`)
    .join('\n')

  fs.appendFileSync(PUBLISH_LOG, logHeader + logLines + '\n', 'utf-8')
  console.log(`📋  Logged to drafts/publish-log.md`)

  console.log(`\n🎉  ${done.length} article(s) converted and ready.`)
  console.log('\nNext steps for each article:')
  console.log('  1. Add a cover image to public/images/articles/<slug>.jpg (1200×800)')
  console.log('  2. Review and tweak the MDX in content/articles/<category>/<slug>.mdx')
  console.log('  3. git add . && git commit && git push  →  Vercel deploys automatically')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
