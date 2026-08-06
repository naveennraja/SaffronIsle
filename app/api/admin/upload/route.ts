import { NextRequest, NextResponse } from 'next/server'
import { isValidSlug } from '@/lib/category-slugs.js'
import { hasSession, unauthorized, signIn, signOut } from '@/lib/admin-session'
import { findExistingArticle } from '@/lib/github-repo'
import { publishArticle, PublishError } from '@/lib/publish-article'

export const runtime = 'nodejs'
// Blob uploads plus the ref update can outrun the default function timeout.
export const maxDuration = 60

/**
 * The admin form's only endpoint: session management and slug lookups over
 * JSON, publishing over multipart. Everything here is request parsing and
 * status codes — the rules live in lib/admin-session, lib/publish-article and
 * lib/github-repo.
 */

/** Session, sign-out, and the form's pre-submit slug check. */
async function handleJson(req: NextRequest) {
  const body = await req.json()

  // Signing in with a password, or — with no password — asking whether the
  // cookie already in hand is still good, which is what lets a page reload
  // resume a session instead of prompting again.
  if (body.checkAuth) {
    if (body.password === undefined) {
      return hasSession(req) ? NextResponse.json({ ok: true }) : unauthorized()
    }
    return signIn(req, body.password)
  }

  if (body.signOut) return signOut()

  // Lets the form tell the author, before they submit, that this slug is
  // already taken and publishing will replace that article.
  if (body.checkSlug) {
    if (!hasSession(req)) return unauthorized()
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
      // A failed lookup must not block publishing — the POST path checks again
      // anyway, and reports the replacement in its response.
      return NextResponse.json({ ok: true, exists: false })
    }
  }

  return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
}

/** Reads the submitted form into the shape publishArticle expects. */
async function handleUpload(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const image = formData.get('image') as File | null
  const text = (name: string) => ((formData.get(name) as string) || '').trim()

  if (!file) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields' },
      { status: 400 }
    )
  }

  const result = await publishArticle({
    document: Buffer.from(await file.arrayBuffer()),
    category: text('category'),
    slug: text('slug'),
    title: (formData.get('title') as string) || '',
    metaTitle: text('metaTitle'),
    metaDescription: text('metaDescription'),
    publishDate: text('publishDate'),
    cover: image
      ? {
          extension: (image.name.split('.').pop() ?? 'jpg').toLowerCase(),
          buffer: Buffer.from(await image.arrayBuffer()),
        }
      : undefined,
  })

  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return handleJson(req)
  }

  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'Invalid content type' }, { status: 400 })
  }

  // Checked before the body is read: an unauthenticated request should not get
  // as far as buffering a multi-megabyte upload.
  if (!hasSession(req)) return unauthorized()

  try {
    return await handleUpload(req)
  } catch (err) {
    if (err instanceof PublishError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
