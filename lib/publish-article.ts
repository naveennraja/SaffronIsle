import 'server-only'

// Plain CommonJS modules, shared with scripts/process-drafts.js
import { convertDocx } from '@/lib/docx-to-mdx.js'
import { checkMdx } from '@/lib/mdx-check.js'
import { buildFrontmatter } from '@/lib/frontmatter.js'
import { isValidCategory, isValidSlug, slugToTitle } from '@/lib/category-slugs.js'
import { todayInSiteZone } from '@/lib/publish-date.js'
import { PUBLISH_LOG_PATH, publishLogRow } from '@/lib/publish-log.js'
import {
  commitFiles,
  findExistingArticle,
  readPublishLog,
  type CommitFile,
} from '@/lib/github-repo'

/**
 * Turning a submitted .docx into a commit on main.
 *
 * This is the whole of what "publish" means, with no knowledge of HTTP beyond
 * the status code carried on PublishError — so the same rules apply whether the
 * article arrives through the admin form or, one day, through a script.
 */

/** Vercel rejects request bodies over ~4.5MB, so cap below that. */
const MAX_TOTAL_BYTES = 4_000_000

/** A refusal the author can act on, carrying the status the route should send. */
export class PublishError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'PublishError'
    this.status = status
  }
}

interface CollectedImage {
  path: string
  publicPath: string
  buffer: Buffer
  width: number
  height: number
}

export interface PublishInput {
  /** The .docx itself. */
  document: Buffer
  category: string
  slug: string
  /** Blank means "keep what the article already has", not "use the default". */
  title?: string
  metaTitle?: string
  metaDescription?: string
  /** YYYY-MM-DD. A future date schedules; blank publishes now. */
  publishDate?: string
  /** Cover image, optional on a replacement. */
  cover?: { extension: string; buffer: Buffer }
}

export interface PublishResult {
  path: string
  imageCount: number
  warnings: string[]
  scheduledFor?: string
  replaced?: { title: string; movedFrom?: string; removedImages: number }
}

/** Rejects anything that cannot produce a valid article path or date. */
function validate(input: PublishInput) {
  if (!input.document || !input.category || !input.slug) {
    throw new PublishError('Missing required fields', 400)
  }
  if (!isValidCategory(input.category)) {
    throw new PublishError(`Invalid category: ${input.category}`, 400)
  }
  if (!isValidSlug(input.slug)) {
    throw new PublishError(
      'Slug must be lowercase letters, numbers, and hyphens only',
      400
    )
  }
  // The date is what makes scheduling work, so a malformed one must not reach
  // the frontmatter: an unparseable date would be treated as published and the
  // article would appear immediately, which is the opposite of what was asked.
  if (input.publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.publishDate)) {
    throw new PublishError('Publish date must be a calendar date (YYYY-MM-DD)', 400)
  }
}

/** Converts the document and refuses anything that would not build. */
async function toMdxBody(document: Buffer, slug: string) {
  const { markdown, description, images, warnings } = (await convertDocx({
    buffer: document,
    slug,
  })) as {
    markdown: string
    description: string
    images: CollectedImage[]
    warnings: string[]
  }

  // Before anything is committed: a body that does not compile would break the
  // build and keep breaking it for every later article, since the bad file
  // stays on main. Rejecting here leaves the author in front of the form with a
  // fixable document. See lib/mdx-check.js.
  const compiled = (await checkMdx(markdown)) as
    | { ok: true }
    | { ok: false; error: string; detail: string }
  if (!compiled.ok) throw new PublishError(compiled.error, 422)

  const totalImageBytes = images.reduce((sum, img) => sum + img.buffer.length, 0)
  if (totalImageBytes > MAX_TOTAL_BYTES) {
    const mb = (totalImageBytes / 1_000_000).toFixed(1)
    throw new PublishError(
      `The pictures in this document add up to ${mb}MB, which is too large to publish ` +
        `(the limit is about 4MB). In Word: select a picture, then Picture Format → ` +
        `Compress Pictures → Email (96 ppi), and save again.`,
      413
    )
  }

  return { markdown, description, images, warnings }
}

export async function publishArticle(input: PublishInput): Promise<PublishResult> {
  validate(input)
  const { category, slug, cover } = input

  const { markdown, description, images, warnings } = await toMdxBody(
    input.document,
    slug
  )

  const existing = await findExistingArticle(slug)

  // Left blank on a replacement, these keep what the article already had,
  // matching how the date and cover behave. Falling through to the slug-derived
  // title instead would quietly rename the article — and drop a meta title she
  // had set — for someone who only meant to fix a sentence.
  const title = input.title || existing?.title || slugToTitle(slug)
  const finalMetaTitle = input.metaTitle || existing?.metaTitle || ''
  const finalMetaDescription = input.metaDescription || existing?.metaDescription || ''
  const finalDescription = description || `${title} — a guide for Indians in Ireland.`
  // A chosen future date is what schedules the article; blank means now.
  // todayInSiteZone rather than UTC so a late-evening publish is not stamped
  // with tomorrow's date and hidden until the next build.
  const today = todayInSiteZone()
  // Correcting an article is not republishing it. Without this, fixing a typo
  // would restamp the date to today and shove the article back to the top of
  // every listing as though it were new.
  const date = input.publishDate || existing?.date || today
  const isScheduled = date > today

  if (!cover && !existing) {
    throw new PublishError('A cover image is required for a new article', 400)
  }

  // Re-uploading without a new cover keeps the one already on the article, so
  // the form can stop demanding a cover just to fix a sentence.
  const coverImage =
    !cover && existing?.coverImage
      ? existing.coverImage
      : `/images/articles/${slug}.${cover?.extension ?? 'jpg'}`

  const frontmatter = buildFrontmatter({
    title,
    metaTitle: finalMetaTitle,
    metaDescription: finalMetaDescription,
    slug,
    category,
    description: finalDescription,
    date,
    coverImage,
  })
  const filePath = `content/articles/${category}/${slug}.mdx`

  const files: CommitFile[] = [
    { path: filePath, text: `${frontmatter}\n\n${markdown}\n` },
    ...images.map((img) => ({ path: img.path, binary: img.buffer })),
  ]

  if (cover) {
    files.push({
      path: `public/images/articles/${slug}.${cover.extension}`,
      binary: cover.buffer,
    })
  }

  // The log records publications, not corrections — a second row for the same
  // article would read as though it had been published twice.
  if (!existing) {
    const existingLog = await readPublishLog()
    files.push({
      path: PUBLISH_LOG_PATH,
      text: existingLog + publishLogRow({ date, title, category, slug }),
    })
  }

  // A shorter rewrite leaves the previous version's later images behind,
  // unreferenced but committed forever. Drop the ones this version did not
  // rewrite; anything still in use was just overwritten above.
  const written = new Set(files.map((f) => f.path))
  const orphans = (existing?.imagePaths ?? []).filter((p) => !written.has(p))

  // Changing category moves the article, so the old file has to go or the slug
  // would exist twice and generateStaticParams would emit it twice.
  const moved = existing && existing.path !== filePath ? [existing.path] : []

  const imageCount = images.length
  const summary =
    imageCount > 0 ? ` (+${imageCount} image${imageCount === 1 ? '' : 's'})` : ''
  // The verb is the git log's only clue as to what actually happened.
  const verb = existing ? 'update' : isScheduled ? `schedule (${date})` : 'publish'
  await commitFiles(files, `${verb}: ${title}${summary}`, [...orphans, ...moved])

  return {
    path: filePath,
    imageCount,
    warnings,
    scheduledFor: isScheduled ? date : undefined,
    replaced: existing
      ? { title: existing.title, movedFrom: moved[0], removedImages: orphans.length }
      : undefined,
  }
}
