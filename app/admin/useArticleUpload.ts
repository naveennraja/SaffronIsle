'use client'

import { useEffect, useState, type SubmitEvent } from 'react'
// Same helper the build-time filter uses, so the date the picker refuses to go
// below is the same "today" that decides whether an article is live.
import { todayInSiteZone } from '@/lib/publish-date.js'

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

export function useArticleUpload(password: string) {
  // Computed once per mount. The admin page is short-lived enough that a
  // session spanning midnight is not worth guarding against.
  const [today] = useState(() => todayInSiteZone())
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [category, setCategory] = useState('visa')
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  // Blank means publish now. A future date means the article commits straight
  // away but stays filtered out of the site until a build runs on that day.
  const [publishDate, setPublishDate] = useState('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [existing, setExisting] = useState<ExistingArticle | null>(null)

  const normalisedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')

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
          body: JSON.stringify({ checkSlug: true, password, slug: normalisedSlug }),
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
          setCategory(data.category)
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
  }, [normalisedSlug, password])

  const coverWarning =
    image && image.size > COVER_WARN_BYTES
      ? `This cover is ${(image.size / 1_000_000).toFixed(1)}MB. It will publish fine and the ` +
        `page will not be slow, but every version is kept forever. If it is easy: open it in ` +
        `Preview → Tools → Adjust Size, set the width to 1200, and save.`
      : null

  function setCoverImage(f: File | null) {
    setImage(f)
    if (f) setImagePreview(URL.createObjectURL(f))
    else setImagePreview(null)
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    // A cover is only mandatory for a new article; replacing one keeps the
    // cover it already has unless a new file is chosen.
    if (!file || !slug.trim() || (!image && !existing)) return

    // Catch oversize uploads here — Vercel answers them with an HTML error
    // page, which would otherwise surface as a meaningless "Upload failed".
    const totalBytes = file.size + (image?.size ?? 0)
    if (totalBytes > MAX_UPLOAD_BYTES) {
      setStatus('error')
      setWarnings([])
      setMessage(
        `This upload is ${(totalBytes / 1_000_000).toFixed(1)}MB, which is too large ` +
          `(the limit is about 4MB). In Word: select a picture, then Picture Format → ` +
          `Compress Pictures → Email (96 ppi), and save again.`
      )
      return
    }

    setStatus('loading')
    // Publishing is a commit to the site's repository, and it takes a few
    // seconds of uploading pictures and pushing before anything comes back.
    // Saying so beats a silent button: it names what is happening and, if it
    // fails, makes it obvious that nothing was saved.
    setMessage(
      existing
        ? 'Saving the corrected article to the repository…'
        : 'Saving the article to the repository…'
    )
    setWarnings([])

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    formData.append('slug', slug.trim().toLowerCase().replace(/\s+/g, '-'))
    formData.append('title', title.trim())
    formData.append('metaTitle', metaTitle.trim())
    formData.append('metaDescription', metaDescription.trim())
    formData.append('publishDate', publishDate)
    formData.append('password', password)
    if (image) formData.append('image', image)

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })

      // A 413 from the platform comes back as HTML, not JSON — read it before
      // res.json() throws and hides the real reason.
      if (!res.headers.get('content-type')?.includes('application/json')) {
        setStatus('error')
        setMessage(
          res.status === 413
            ? 'This upload is too large (the limit is about 4MB). Compress the pictures in Word and try again.'
            : `The server returned an unexpected response (${res.status}). Please try again.`
        )
        return
      }

      const data = await res.json()
      if (data.ok) {
        const count: number = data.imageCount ?? 0
        const pictures =
          count > 0 ? ` with ${count} picture${count === 1 ? '' : 's'}` : ''
        const scheduled: string | undefined = data.scheduledFor
        const replaced = data.replaced as
          | { title: string; movedFrom?: string; removedImages: number }
          | undefined

        setStatus('success')
        if (replaced) {
          const moved = replaced.movedFrom ? ', and moved to its new category' : ''
          const tidied =
            replaced.removedImages > 0
              ? ` ${replaced.removedImages} unused picture${replaced.removedImages === 1 ? ' was' : 's were'} removed.`
              : ''
          setMessage(
            `"${replaced.title}" was replaced${pictures}${moved} and committed to ` +
              `the repository. Its original publish date was kept.${tidied} ` +
              `Live in ~1 minute.`
          )
        } else {
          setMessage(
            scheduled
              ? `Article committed to the repository${pictures}. It stays hidden ` +
                  `until ${scheduled}, then goes live in the early hours of that morning.`
              : `Article published${pictures}! It has been committed to the ` +
                  `repository and will be live in ~1 minute.`
          )
        }
        setWarnings(data.warnings ?? [])
        setFile(null)
        setImage(null)
        setImagePreview(null)
        setSlug('')
        setTitle('')
        // Must clear too, or the next article silently inherits this one's
        // meta title — which would be invisible until it reached search results.
        setMetaTitle('')
        setMetaDescription('')
        setPublishDate('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
        setWarnings([])
      }
    } catch {
      setStatus('error')
      setMessage('Upload failed — please try again')
      setWarnings([])
    }
  }

  return {
    file,
    setFile,
    imagePreview,
    setCoverImage,
    coverWarning,
    category,
    setCategory,
    slug,
    setSlug,
    title,
    setTitle,
    metaTitle,
    setMetaTitle,
    metaDescription,
    setMetaDescription,
    publishDate,
    setPublishDate,
    today,
    // Cleared immediately when the slug is emptied, rather than waiting out the
    // debounce, so the replace warning cannot linger over a blank field.
    existing: normalisedSlug ? existing : null,
    status,
    message,
    warnings,
    handleSubmit,
    canSubmit: Boolean(file && slug.trim() && (image || existing)),
    isLoading: status === 'loading',
  }
}
