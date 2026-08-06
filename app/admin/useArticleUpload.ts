'use client'

import { useState, type SubmitEvent } from 'react'
// Same helper the build-time filter uses, so the date the picker refuses to go
// below is the same "today" that decides whether an article is live.
import { todayInSiteZone } from '@/lib/publish-date.js'

export type UploadStatus = 'idle' | 'loading' | 'success' | 'error'

/** Vercel rejects request bodies over ~4.5MB with an HTML error page. */
const MAX_UPLOAD_BYTES = 4_000_000

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
  // Blank means publish now. A future date means the article commits straight
  // away but stays filtered out of the site until a build runs on that day.
  const [publishDate, setPublishDate] = useState('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  function setCoverImage(f: File | null) {
    setImage(f)
    if (f) setImagePreview(URL.createObjectURL(f))
    else setImagePreview(null)
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!file || !image || !slug.trim()) return

    // Catch oversize uploads here — Vercel answers them with an HTML error
    // page, which would otherwise surface as a meaningless "Upload failed".
    const totalBytes = file.size + image.size
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
    setMessage('')
    setWarnings([])

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    formData.append('slug', slug.trim().toLowerCase().replace(/\s+/g, '-'))
    formData.append('title', title.trim())
    formData.append('metaTitle', metaTitle.trim())
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

        setStatus('success')
        setMessage(
          scheduled
            ? `Article saved${pictures}. It stays hidden until ${scheduled}, ` +
                `then goes live in the early hours of that morning.`
            : `Article published${pictures}! It will be live in ~1 minute.`
        )
        setWarnings(data.warnings ?? [])
        setFile(null)
        setImage(null)
        setImagePreview(null)
        setSlug('')
        setTitle('')
        // Must clear too, or the next article silently inherits this one's
        // meta title — which would be invisible until it reached search results.
        setMetaTitle('')
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
    category,
    setCategory,
    slug,
    setSlug,
    title,
    setTitle,
    metaTitle,
    setMetaTitle,
    publishDate,
    setPublishDate,
    today,
    status,
    message,
    warnings,
    handleSubmit,
    canSubmit: Boolean(file && image && slug.trim()),
    isLoading: status === 'loading',
  }
}
