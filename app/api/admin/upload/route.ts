import { NextRequest, NextResponse } from 'next/server'
import matter from 'gray-matter'
// Plain CommonJS modules, shared with scripts/process-drafts.js
import { convertDocx } from '@/lib/docx-to-mdx.js'
import { checkMdx } from '@/lib/mdx-check.js'
import { buildFrontmatter } from '@/lib/frontmatter.js'
import { isValidCategory, isValidSlug, slugToTitle } from '@/lib/category-slugs.js'
import { todayInSiteZone } from '@/lib/publish-date.js'
import {
  PUBLISH_LOG_PATH,
  PUBLISH_LOG_HEADER,
  publishLogRow,
} from '@/lib/publish-log.js'
import {
  SESSION_COOKIE,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  checkRateLimit,
  recordFailure,
  clearFailures,
  clientIdFromHeaders,
  sessionCookieOptions,
} from '@/lib/admin-auth.js'

export const runtime = 'nodejs'
// Blob uploads plus the ref update can outrun the default function timeout.
export const maxDuration = 60

/** Vercel rejects request bodies over ~4.5MB, so cap below that. */
const MAX_TOTAL_BYTES = 4_000_000

interface CollectedImage {
  path: string
  publicPath: string
  buffer: Buffer
  width: number
  height: number
}

interface CommitFile {
  path: string
  text?: string
  binary?: Buffer
}

/** Whether the request carries a valid, unexpired session cookie. */
function hasSession(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
}

const UNAUTHORIZED = () =>
  NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

/**
 * Signs in: rate-limited, constant-time, and answered with a session cookie.
 *
 * The cookie is the credential from here on. The password is not echoed back
 * and is never needed again until it expires, so it stops travelling with every
 * slug lookup and every upload.
 */
function signIn(req: NextRequest, password: unknown) {
  const clientId = clientIdFromHeaders(req.headers)

  const limit = checkRateLimit(clientId)
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many failed attempts. Try again in about ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  if (!verifyPassword(password)) {
    const after = recordFailure(clientId)
    return NextResponse.json(
      {
        ok: false,
        error: after.allowed
          ? 'Wrong password'
          : `Too many failed attempts. Try again in about ${Math.ceil(after.retryAfterSeconds / 60)} minute(s).`,
      },
      { status: after.allowed ? 401 : 429 }
    )
  }

  clearFailures(clientId)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions())
  return res
}

function githubEnv() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const missing = [!token && 'GITHUB_TOKEN', !repo && 'GITHUB_REPO'].filter(Boolean)
  if (missing.length) {
    throw new Error(`Missing env var(s) on the server: ${missing.join(', ')}`)
  }
  return { token: token as string, repo: repo as string }
}

async function gh(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const { token, repo } = githubEnv()
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/**
 * Writes every file in one commit via the Git Data API.
 *
 * The Contents API can only touch one file per call, which meant a publish
 * produced N+2 commits (and N+2 deploys), and could leave an article live
 * referencing images whose pushes had failed. This is atomic instead.
 */
async function commitFiles(
  files: CommitFile[],
  message: string,
  /** Paths to remove in the same commit — images a rewrite orphaned, or an
   *  article's old location after a category change. */
  deletions: string[] = []
) {
  const branch = process.env.GITHUB_BRANCH || 'main'

  const ref = await gh(`/git/ref/heads/${branch}`)
  if (!ref.ok) {
    throw new Error(
      `Could not read branch "${branch}": ${(ref.data.message as string) ?? ref.status}`
    )
  }
  const baseSha = (ref.data.object as { sha: string }).sha

  const baseCommit = await gh(`/git/commits/${baseSha}`)
  if (!baseCommit.ok) throw new Error('Could not read the latest commit')
  const baseTreeSha = (baseCommit.data.tree as { sha: string }).sha

  // Binaries need a blob each; text files can be inlined in the tree directly.
  const binaries = files.filter((f): f is CommitFile & { binary: Buffer } => !!f.binary)
  const blobShas = await Promise.all(
    binaries.map(async (f) => {
      const blob = await gh('/git/blobs', {
        method: 'POST',
        body: { content: f.binary.toString('base64'), encoding: 'base64' },
      })
      if (!blob.ok) {
        throw new Error(`Failed to upload ${f.path}: ${blob.data.message ?? blob.status}`)
      }
      return blob.data.sha as string
    })
  )

  const tree = [
    ...binaries.map((f, i) => ({
      path: f.path,
      mode: '100644',
      type: 'blob',
      sha: blobShas[i],
    })),
    ...files
      .filter((f) => f.text !== undefined)
      .map((f) => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        content: f.text as string,
      })),
    // A null sha against base_tree is how the Git Data API expresses a
    // deletion, which keeps removals inside the same atomic commit as the
    // writes rather than needing a second one.
    ...deletions.map((path) => ({
      path,
      mode: '100644',
      type: 'blob',
      sha: null,
    })),
  ]

  const newTree = await gh('/git/trees', {
    method: 'POST',
    body: { base_tree: baseTreeSha, tree },
  })
  if (!newTree.ok) {
    throw new Error(`Failed to build commit: ${newTree.data.message ?? newTree.status}`)
  }

  const commit = await gh('/git/commits', {
    method: 'POST',
    body: { message, tree: newTree.data.sha, parents: [baseSha] },
  })
  if (!commit.ok) {
    throw new Error(`Failed to create commit: ${commit.data.message ?? commit.status}`)
  }

  const updated = await gh(`/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: { sha: commit.data.sha, force: false },
  })
  if (!updated.ok) {
    if (updated.status === 422) {
      throw new Error('Someone else published at the same time — please try again')
    }
    throw new Error(`Failed to update branch: ${updated.data.message ?? updated.status}`)
  }

  return commit.data.sha as string
}

interface ExistingArticle {
  /** Repo path of the .mdx, e.g. content/articles/visa/irp-guide.mdx */
  path: string
  category: string
  title: string
  metaTitle: string
  metaDescription: string
  date: string
  coverImage: string
  /** Paths of body images from this version, so replacements can drop leftovers. */
  imagePaths: string[]
}

/**
 * Every file currently on the branch, as one recursive tree read.
 *
 * One call rather than a probe per category: the answer is needed to decide
 * whether a slug exists, which cover to keep, and which images the previous
 * version left behind.
 */
async function listRepoPaths(): Promise<string[]> {
  const branch = process.env.GITHUB_BRANCH || 'main'
  const ref = await gh(`/git/ref/heads/${branch}`)
  if (!ref.ok) return []
  const baseSha = (ref.data.object as { sha: string }).sha

  const tree = await gh(`/git/trees/${baseSha}?recursive=1`)
  if (!tree.ok) return []
  return ((tree.data.tree as { path: string; type: string }[]) ?? [])
    .filter((e) => e.type === 'blob')
    .map((e) => e.path)
}

/**
 * Finds an article by slug across every category.
 *
 * Deliberately not scoped to the category being published into. Article URLs
 * are /articles/<slug> with no category segment, so slugs are globally unique:
 * publishing 'irp-guide' under housing while it already exists under visa would
 * create two files claiming one URL, and generateStaticParams would emit a
 * duplicate route.
 */
async function findExistingArticle(slug: string): Promise<ExistingArticle | null> {
  const paths = await listRepoPaths()
  const mdxPath = paths.find((p) =>
    new RegExp(`^content/articles/[^/]+/${slug}\\.mdx$`).test(p)
  )
  if (!mdxPath) return null

  const file = await gh(`/contents/${mdxPath}`)
  if (!file.ok || typeof file.data.content !== 'string') return null

  const raw = Buffer.from(file.data.content, 'base64').toString('utf-8')
  const { data } = matter(raw)

  return {
    path: mdxPath,
    category: mdxPath.split('/')[2],
    title: String(data.title ?? slug),
    metaTitle: String(data.metaTitle ?? ''),
    metaDescription: String(data.metaDescription ?? ''),
    date: String(data.date ?? ''),
    coverImage: String(data.coverImage ?? ''),
    imagePaths: paths.filter((p) =>
      p.startsWith(`public/images/articles/${slug}/`)
    ),
  }
}

async function readPublishLog(): Promise<string> {
  const existing = await gh(`/contents/${PUBLISH_LOG_PATH}`)
  if (existing.ok && typeof existing.data.content === 'string') {
    return Buffer.from(existing.data.content, 'base64').toString('utf-8')
  }
  return PUBLISH_LOG_HEADER
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''

  // Auth check (JSON body with checkAuth: true)
  if (contentType.includes('application/json')) {
    const body = await req.json()

    // Signing in with a password, or — with no password — asking whether the
    // cookie already in hand is still good, which is what lets a page reload
    // resume a session instead of prompting again.
    if (body.checkAuth) {
      if (body.password === undefined) {
        return hasSession(req) ? NextResponse.json({ ok: true }) : UNAUTHORIZED()
      }
      return signIn(req, body.password)
    }

    // Ends the session by clearing the cookie. Nothing can revoke the token
    // server-side, so this is what "sign out" means: the browser stops holding
    // a credential, and the token expires on its own within hours.
    if (body.signOut) {
      const res = NextResponse.json({ ok: true })
      res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
      return res
    }

    // Lets the form tell the author, before they submit, that this slug is
    // already taken and publishing will replace that article.
    if (body.checkSlug) {
      if (!hasSession(req)) return UNAUTHORIZED()
      const slug = String(body.slug ?? '').trim()
      if (!slug || !isValidSlug(slug)) {
        return NextResponse.json({ ok: true, exists: false })
      }
      try {
        const existing = await findExistingArticle(slug)
        return NextResponse.json({
          ok: true,
          exists: Boolean(existing),
          title: existing?.title,
          date: existing?.date,
          category: existing?.category,
          imageCount: existing?.imagePaths.length ?? 0,
        })
      } catch {
        // A failed lookup must not block publishing — the POST path checks
        // again anyway, and reports the replacement in its response.
        return NextResponse.json({ ok: true, exists: false })
      }
    }

    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  // File upload (multipart/form-data)
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'Invalid content type' }, { status: 400 })
  }

  // Checked before the body is read: an unauthenticated request should not get
  // as far as buffering a multi-megabyte upload.
  if (!hasSession(req)) return UNAUTHORIZED()

  const formData = await req.formData()
  const category = formData.get('category') as string
  const slug = formData.get('slug') as string
  const titleOverride = (formData.get('title') as string) || ''
  const metaTitle = ((formData.get('metaTitle') as string) || '').trim()
  const metaDescription = ((formData.get('metaDescription') as string) || '').trim()
  const publishDate = ((formData.get('publishDate') as string) || '').trim()
  const file = formData.get('file') as File | null
  const image = formData.get('image') as File | null

  if (!file || !category || !slug) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
  }

  if (!isValidCategory(category)) {
    return NextResponse.json({ ok: false, error: `Invalid category: ${category}` }, { status: 400 })
  }

  if (!isValidSlug(slug)) {
    return NextResponse.json({ ok: false, error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
  }

  // The date is what makes scheduling work, so a malformed one must not reach
  // the frontmatter: an unparseable date would be treated as published and the
  // article would appear immediately, which is the opposite of what was asked.
  if (publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
    return NextResponse.json(
      { ok: false, error: 'Publish date must be a calendar date (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { markdown, description, images, warnings } = (await convertDocx({
      buffer,
      slug,
    })) as {
      markdown: string
      description: string
      images: CollectedImage[]
      warnings: string[]
    }

    // Before anything is committed: a body that does not compile would break
    // the build and keep breaking it for every later article, since the bad
    // file stays on main. Rejecting here leaves the author in front of the form
    // with a fixable document. See lib/mdx-check.js.
    const compiled = (await checkMdx(markdown)) as
      | { ok: true }
      | { ok: false; error: string; detail: string }
    if (!compiled.ok) {
      return NextResponse.json({ ok: false, error: compiled.error }, { status: 422 })
    }

    const totalImageBytes = images.reduce((sum, img) => sum + img.buffer.length, 0)
    if (totalImageBytes > MAX_TOTAL_BYTES) {
      const mb = (totalImageBytes / 1_000_000).toFixed(1)
      return NextResponse.json(
        {
          ok: false,
          error:
            `The pictures in this document add up to ${mb}MB, which is too large to publish ` +
            `(the limit is about 4MB). In Word: select a picture, then Picture Format → ` +
            `Compress Pictures → Email (96 ppi), and save again.`,
        },
        { status: 413 }
      )
    }

    const existing = await findExistingArticle(slug)

    // Left blank on a replacement, these keep what the article already had,
    // matching how the date and cover behave. Falling through to the
    // slug-derived title instead would quietly rename the article — and drop a
    // meta title she had set — for someone who only meant to fix a sentence.
    const title = titleOverride || existing?.title || slugToTitle(slug)
    const finalMetaTitle = metaTitle || existing?.metaTitle || ''
    const finalMetaDescription = metaDescription || existing?.metaDescription || ''
    const finalDescription = description || `${title} — a guide for Indians in Ireland.`
    // A chosen future date is what schedules the article; blank means now.
    // todayInSiteZone rather than UTC so a late-evening publish is not stamped
    // with tomorrow's date and hidden until the next build.
    const today = todayInSiteZone()
    // Correcting an article is not republishing it. Without this, fixing a typo
    // would restamp the date to today and shove the article back to the top of
    // every listing as though it were new.
    const date = publishDate || existing?.date || today
    const isScheduled = date > today

    // Re-uploading without a new cover keeps the one already on the article,
    // so the form can stop demanding a cover just to fix a sentence.
    const imageExt = image ? (image.name.split('.').pop() ?? 'jpg').toLowerCase() : 'jpg'
    const coverImage =
      !image && existing?.coverImage
        ? existing.coverImage
        : `/images/articles/${slug}.${imageExt}`

    if (!image && !existing) {
      return NextResponse.json(
        { ok: false, error: 'A cover image is required for a new article' },
        { status: 400 }
      )
    }

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
    const mdxContent = `${frontmatter}\n\n${markdown}\n`
    const filePath = `content/articles/${category}/${slug}.mdx`

    const files: CommitFile[] = [
      { path: filePath, text: mdxContent },
      ...images.map((img) => ({ path: img.path, binary: img.buffer })),
    ]

    if (image) {
      files.push({
        path: `public/images/articles/${slug}.${imageExt}`,
        binary: Buffer.from(await image.arrayBuffer()),
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

    // Changing category moves the article, so the old file has to go or the
    // slug would exist twice and generateStaticParams would emit it twice.
    const moved = existing && existing.path !== filePath ? [existing.path] : []

    const imageCount = images.length
    const summary = imageCount > 0 ? ` (+${imageCount} image${imageCount === 1 ? '' : 's'})` : ''
    // The verb is the git log's only clue as to what actually happened.
    const verb = existing
      ? 'update'
      : isScheduled
        ? `schedule (${date})`
        : 'publish'
    await commitFiles(files, `${verb}: ${title}${summary}`, [...orphans, ...moved])

    return NextResponse.json({
      ok: true,
      path: filePath,
      imageCount,
      warnings,
      scheduledFor: isScheduled ? date : undefined,
      replaced: existing
        ? { title: existing.title, movedFrom: moved[0], removedImages: orphans.length }
        : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
