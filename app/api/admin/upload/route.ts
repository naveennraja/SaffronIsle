import { NextRequest, NextResponse } from 'next/server'
// Plain CommonJS modules, shared with scripts/process-drafts.js
import { convertDocx } from '@/lib/docx-to-mdx.js'
import { buildFrontmatter } from '@/lib/frontmatter.js'
import { isValidCategory, isValidSlug, slugToTitle } from '@/lib/category-slugs.js'
import { todayInSiteZone } from '@/lib/publish-date.js'
import {
  PUBLISH_LOG_PATH,
  PUBLISH_LOG_HEADER,
  publishLogRow,
} from '@/lib/publish-log.js'

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

function checkPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  return password === adminPassword
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
async function commitFiles(files: CommitFile[], message: string) {
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
    if (body.checkAuth) {
      if (checkPassword(body.password)) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  // File upload (multipart/form-data)
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'Invalid content type' }, { status: 400 })
  }

  const formData = await req.formData()
  const password = formData.get('password') as string
  const category = formData.get('category') as string
  const slug = formData.get('slug') as string
  const titleOverride = (formData.get('title') as string) || ''
  const metaTitle = ((formData.get('metaTitle') as string) || '').trim()
  const publishDate = ((formData.get('publishDate') as string) || '').trim()
  const file = formData.get('file') as File | null
  const image = formData.get('image') as File | null

  if (!checkPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

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

    const title = titleOverride || slugToTitle(slug)
    const finalDescription = description || `${title} — a guide for Indians in Ireland.`
    // A chosen future date is what schedules the article; blank means now.
    // todayInSiteZone rather than UTC so a late-evening publish is not stamped
    // with tomorrow's date and hidden until the next build.
    const today = todayInSiteZone()
    const date = publishDate || today
    const isScheduled = date > today
    const imageExt = image ? (image.name.split('.').pop() ?? 'jpg').toLowerCase() : 'jpg'

    const frontmatter = buildFrontmatter({
      title,
      metaTitle,
      slug,
      category,
      description: finalDescription,
      date,
      imageExt,
    })
    const mdxContent = `${frontmatter}\n\n${markdown}\n`
    const filePath = `content/articles/${category}/${slug}.mdx`

    const existingLog = await readPublishLog()
    const logLine = publishLogRow({ date, title, category, slug })

    const files: CommitFile[] = [
      { path: filePath, text: mdxContent },
      { path: PUBLISH_LOG_PATH, text: existingLog + logLine },
      ...images.map((img) => ({ path: img.path, binary: img.buffer })),
    ]

    if (image) {
      files.push({
        path: `public/images/articles/${slug}.${imageExt}`,
        binary: Buffer.from(await image.arrayBuffer()),
      })
    }

    const imageCount = images.length
    const summary = imageCount > 0 ? ` (+${imageCount} image${imageCount === 1 ? '' : 's'})` : ''
    // "schedule:" rather than "publish:" so the git log does not claim an
    // article went live on a day it was only written.
    const verb = isScheduled ? `schedule (${date})` : 'publish'
    await commitFiles(files, `${verb}: ${title}${summary}`)

    return NextResponse.json({
      ok: true,
      path: filePath,
      imageCount,
      warnings,
      scheduledFor: isScheduled ? date : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
