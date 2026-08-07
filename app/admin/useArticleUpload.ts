'use client'

import { useEffect, useState, type SubmitEvent } from 'react'
// Same helper the build-time filter uses, so the date the picker refuses to go
// below is the same "today" that decides whether an article is live.
import { todayInSiteZone } from '@/lib/publish-date.js'
import { UPLOAD_FIELDS } from '@/lib/upload-fields'

export type UploadStatus = 'idle' | 'loading' | 'success' | 'error'

/** An article already published under the slug being typed. */
export type ExistingArticle = {
  title: string
  date: string
  category: string
  imageCount: number
}

/** Vercel rejects request bodies over ~4.5MB with an HTML error page. */
const MAX_UPLOAD_BYTES = 4_000_000

/**
 * Above this a cover gets a nudge, never a refusal.
 *
 * Nothing is resized on the server: Vercel already optimises delivery, so a
 * large original does not make the page slow. The cost is git history, which
 * grows by whatever is committed and never shrinks. A note that costs one
 * sentence is the right size of fix for a problem measured in years.
 */
const COVER_WARN_BYTES = 500_000

/**
 * Everything the author has entered about the article.
 *
 * One object rather than a field per useState, because these are only ever read
 * together and cleared together. Publishing used to reset them with eight
 * separate calls, and forgetting one is not a visible mistake — the note on
 * metaTitle below records the time that happened, where the next article
 * inherited the previous one's meta title and nothing said so until it appeared
 * in search results.
 */
type Fields = {
  file: File | null
  image: File | null
  category: string
  slug: string
  title: string
  metaTitle: string
  /** Cleared on publish like the rest: it is invisible on the page itself, so
   *  an inherited value would only surface in search results. */
  metaDescription: string
  /** Blank means publish now. A future date means the article commits straight
   *  away but stays filtered out of the site until a build runs on that day. */
  publishDate: string
}

const EMPTY_FIELDS: Fields = {
  file: null,
  image: null,
  category: 'visa',
  slug: '',
  title: '',
  metaTitle: '',
  metaDescription: '',
  publishDate: '',
}

/**
 * What the last submit did, as one value.
 *
 * status, message and warnings are always set together — a new attempt that
 * updated the status but left the previous attempt's warnings on screen would
 * be reporting two different events at once. Keeping them in one object, and
 * writing them through `report` below, means that cannot be expressed.
 */
type Result = {
  status: UploadStatus
  message: string
  warnings: string[]
}

const IDLE: Result = { status: 'idle', message: '', warnings: [] }

const normaliseSlug = (slug: string) => slug.trim().toLowerCase().replace(/\s+/g, '-')

/**
 * No credential is passed in or held here: the session cookie set at sign-in
 * travels with these requests automatically, and it is httpOnly, so this code
 * could not read it even if it wanted to.
 */
export function useArticleUpload() {
  // Computed once per mount. The admin page is short-lived enough that a
  // session spanning midnight is not worth guarding against.
  const [today] = useState(() => todayInSiteZone())
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(IDLE)
  const [existing, setExisting] = useState<ExistingArticle | null>(null)

  const update = (patch: Partial<Fields>) => setFields((prev) => ({ ...prev, ...patch }))

  /** Replaces the whole result, so warnings never outlive the attempt that
   *  produced them. */
  const report = (next: Partial<Result>) => setResult({ ...IDLE, ...next })

  const normalisedSlug = normaliseSlug(fields.slug)

  // An object URL holds its file in memory until it is revoked. Revoking in the
  // cleanup rather than at the point the cover changes means it also happens
  // when the page unmounts mid-edit.
  useEffect(() => {
    if (!imagePreview) return
    return () => URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  // Looks up the typed slug so the author learns they are about to replace an
  // article *before* they publish, not from the result afterwards. Debounced
  // because it runs against the GitHub API on every keystroke otherwise.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      // Checked in here rather than in the effect body: setting state
      // synchronously during an effect cascades an extra render, and React
      // Compiler rejects it.
      if (!normalisedSlug) {
        if (!cancelled) setExisting(null)
        return
      }
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkSlug: true, slug: normalisedSlug }),
        })
        const data = await res.json()
        if (cancelled) return
        setExisting(
          data.exists
            ? {
                title: data.title,
                date: data.date,
                category: data.category,
                imageCount: data.imageCount ?? 0,
              }
            : null
        )
        // Follow the article the slug resolved to. The dropdown defaults to
        // 'visa', so without this, replacing an article without touching the
        // category silently relocates it — which is how a community story
        // ended up filed under visa. Changing the dropdown afterwards still
        // moves it deliberately; this only fires when the slug changes, and a
        // different slug means a different article.
        if (data.exists && data.category) {
          update({ category: data.category })
        }
      } catch {
        // Never block publishing on a failed lookup — the server checks again
        // and reports what it actually replaced.
        if (!cancelled) setExisting(null)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [normalisedSlug])

  const coverWarning =
    fields.image && fields.image.size > COVER_WARN_BYTES
      ? `This cover is ${(fields.image.size / 1_000_000).toFixed(1)}MB. It will publish fine and the ` +
        `page will not be slow, but every version is kept forever. If it is easy: open it in ` +
        `Preview → Tools → Adjust Size, set the width to 1200, and save.`
      : null

  function setCoverImage(f: File | null) {
    update({ image: f })
    setImagePreview(f ? URL.createObjectURL(f) : null)
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const { file, image, category, slug, title, metaTitle, metaDescription, publishDate } =
      fields

    // A cover is only mandatory for a new article; replacing one keeps the
    // cover it already has unless a new file is chosen.
    if (!file || !slug.trim() || (!image && !existing)) return

    // Catch oversize uploads here — Vercel answers them with an HTML error
    // page, which would otherwise surface as a meaningless "Upload failed".
    const totalBytes = file.size + (image?.size ?? 0)
    if (totalBytes > MAX_UPLOAD_BYTES) {
      report({
        status: 'error',
        message:
          `This upload is ${(totalBytes / 1_000_000).toFixed(1)}MB, which is too large ` +
          `(the limit is about 4MB). In Word: select a picture, then Picture Format → ` +
          `Compress Pictures → Email (96 ppi), and save again.`,
      })
      return
    }

    // Publishing is a commit to the site's repository, and it takes a few
    // seconds of uploading pictures and pushing before anything comes back.
    // Saying so beats a silent button: it names what is happening and, if it
    // fails, makes it obvious that nothing was saved.
    report({
      status: 'loading',
      message: existing
        ? 'Saving the corrected article to the repository…'
        : 'Saving the article to the repository…',
    })

    // Field names come from the shared contract, not from literals typed twice.
    // Whitespace is left alone on purpose: the server trims every text field, so
    // trimming here as well would only disguise it if that ever stopped.
    const formData = new FormData()
    formData.append(UPLOAD_FIELDS.file, file)
    formData.append(UPLOAD_FIELDS.category, category)
    formData.append(UPLOAD_FIELDS.slug, normaliseSlug(slug))
    formData.append(UPLOAD_FIELDS.title, title)
    formData.append(UPLOAD_FIELDS.metaTitle, metaTitle)
    formData.append(UPLOAD_FIELDS.metaDescription, metaDescription)
    formData.append(UPLOAD_FIELDS.publishDate, publishDate)
    if (image) formData.append(UPLOAD_FIELDS.image, image)

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })

      // Sessions last hours, so an expired one is most likely to surface here,
      // after the document was chosen and the button pressed. Say what
      // happened, since "Unauthorized" would read as though the article was
      // rejected rather than the sign-in having lapsed.
      if (res.status === 401) {
        report({
          status: 'error',
          message:
            'Your session has expired. Reload the page, sign in again, and republish — nothing was saved.',
        })
        return
      }

      // A 413 from the platform comes back as HTML, not JSON — read it before
      // res.json() throws and hides the real reason.
      if (!res.headers.get('content-type')?.includes('application/json')) {
        report({
          status: 'error',
          message:
            res.status === 413
              ? 'This upload is too large (the limit is about 4MB). Compress the pictures in Word and try again.'
              : `The server returned an unexpected response (${res.status}). Please try again.`,
        })
        return
      }

      const data = await res.json()
      if (!data.ok) {
        report({ status: 'error', message: data.error || 'Something went wrong' })
        return
      }

      const count: number = data.imageCount ?? 0
      const pictures = count > 0 ? ` with ${count} picture${count === 1 ? '' : 's'}` : ''
      const scheduled: string | undefined = data.scheduledFor
      const replaced = data.replaced as
        | { title: string; movedFrom?: string; removedImages: number }
        | undefined

      let message: string
      if (replaced) {
        const moved = replaced.movedFrom ? ', and moved to its new category' : ''
        const tidied =
          replaced.removedImages > 0
            ? ` ${replaced.removedImages} unused picture${replaced.removedImages === 1 ? ' was' : 's were'} removed.`
            : ''
        message =
          `"${replaced.title}" was replaced${pictures}${moved} and committed to ` +
          `the repository. Its original publish date was kept.${tidied} ` +
          `Live in ~1 minute.`
      } else if (scheduled) {
        message =
          `Article committed to the repository${pictures}. It stays hidden ` +
          `until ${scheduled}, then goes live in the early hours of that morning.`
      } else {
        message =
          `Article published${pictures}! It has been committed to the ` +
          `repository and will be live in ~1 minute.`
      }

      report({ status: 'success', message, warnings: data.warnings ?? [] })
      // The category is deliberately kept: the next article is usually filed
      // alongside the last one, and the slug lookup overrides it anyway the
      // moment an existing slug is typed.
      setFields({ ...EMPTY_FIELDS, category })
      setImagePreview(null)
    } catch {
      report({ status: 'error', message: 'Upload failed — please try again' })
    }
  }

  return {
    file: fields.file,
    setFile: (file: File | null) => update({ file }),
    imagePreview,
    setCoverImage,
    coverWarning,
    category: fields.category,
    setCategory: (category: string) => update({ category }),
    slug: fields.slug,
    setSlug: (slug: string) => update({ slug }),
    title: fields.title,
    setTitle: (title: string) => update({ title }),
    metaTitle: fields.metaTitle,
    setMetaTitle: (metaTitle: string) => update({ metaTitle }),
    metaDescription: fields.metaDescription,
    setMetaDescription: (metaDescription: string) => update({ metaDescription }),
    publishDate: fields.publishDate,
    setPublishDate: (publishDate: string) => update({ publishDate }),
    today,
    // Cleared immediately when the slug is emptied, rather than waiting out the
    // debounce, so the replace warning cannot linger over a blank field.
    existing: normalisedSlug ? existing : null,
    status: result.status,
    message: result.message,
    warnings: result.warnings,
    handleSubmit,
    canSubmit: Boolean(fields.file && fields.slug.trim() && (fields.image || existing)),
    isLoading: result.status === 'loading',
  }
}
