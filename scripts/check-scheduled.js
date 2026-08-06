// @ts-check
/**
 * Reports whether any article's publish date falls on today.
 *
 * Scheduling works by giving an article a future `date`, which lib/articles.ts
 * filters out at build time. Nothing changes on the live site until a build
 * runs, so this script exists to answer one question for the daily workflow:
 * is a rebuild actually needed this morning, or would it be a no-op?
 *
 * Only articles dated *exactly today* count. Anything older is already live
 * from a previous build, and rebuilding for it would deploy the same output.
 *
 * Writes `due=true|false` and `titles=...` to GITHUB_OUTPUT when running in
 * Actions, and prints a summary either way so a manual run is readable.
 */

const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { todayInSiteZone, isDueToday } = require('../lib/publish-date.js')

const CONTENT_DIR = path.join(process.cwd(), 'content', 'articles')

function findMdxFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return findMdxFiles(full)
    return entry.name.endsWith('.mdx') ? [full] : []
  })
}

function main() {
  const today = todayInSiteZone()
  const due = []

  for (const file of findMdxFiles(CONTENT_DIR)) {
    let data
    try {
      ;({ data } = matter(fs.readFileSync(file, 'utf-8')))
    } catch {
      // A malformed article is the build's problem to report, not this
      // script's. Skipping keeps a broken file from suppressing a rebuild
      // that other articles legitimately need.
      continue
    }
    if (isDueToday(String(data.date ?? ''), today)) {
      due.push({ title: String(data.title ?? path.basename(file, '.mdx')), file })
    }
  }

  console.log(`Today in Europe/Dublin: ${today}`)
  if (due.length === 0) {
    console.log('No articles are due to publish today — skipping rebuild.')
  } else {
    console.log(`${due.length} article(s) due to publish today:`)
    for (const a of due) console.log(`  • ${a.title}`)
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `due=${due.length > 0}\n` +
        `count=${due.length}\n` +
        `titles=${due.map((a) => a.title).join('; ')}\n`
    )
  }
}

main()
