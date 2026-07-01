'use client'

import { useState } from 'react'

const CATEGORIES = [
  { value: 'visa', label: 'Visa' },
  { value: 'student-life', label: 'Student Life' },
  { value: 'food-groceries', label: 'Food & Groceries' },
  { value: 'work-careers', label: 'Work & Careers' },
  { value: 'finances', label: 'Finances' },
  { value: 'housing', label: 'Housing' },
  { value: 'explore-ireland', label: 'Explore Ireland' },
  { value: 'community-stories', label: 'Community Stories' },
]

type Status = 'idle' | 'loading' | 'success' | 'error' | 'auth'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [category, setCategory] = useState('visa')
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setStatus('auth')
    fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkAuth: true, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setAuthed(true)
          setAuthError('')
        } else {
          setAuthError('Wrong password')
        }
        setStatus('idle')
      })
      .catch(() => {
        setAuthError('Something went wrong')
        setStatus('idle')
      })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !image || !slug.trim()) return

    setStatus('loading')
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    formData.append('slug', slug.trim().toLowerCase().replace(/\s+/g, '-'))
    formData.append('title', title.trim())
    formData.append('password', password)
    if (image) formData.append('image', image)

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ok) {
        setStatus('success')
        setMessage(`Article published! It will be live in ~1 minute.`)
        setFile(null)
        setImage(null)
        setImagePreview(null)
        setSlug('')
        setTitle('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setMessage('Upload failed — please try again')
    }
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="w-full max-w-sm rounded-2xl border border-mist/60 bg-white p-8 shadow-soft">
          <h1 className="mb-2 font-serif text-2xl text-forest">Saffron Isle Admin</h1>
          <p className="mb-6 text-sm text-gray-500">Enter your password to continue</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm focus:border-saffron focus:outline-none"
              autoFocus
            />
            {authError && <p className="text-sm text-red-500">{authError}</p>}
            <button
              type="submit"
              disabled={status === 'auth'}
              className="w-full rounded-lg bg-saffron px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-dark disabled:opacity-50"
            >
              {status === 'auth' ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-lg rounded-2xl border border-mist/60 bg-white p-8 shadow-soft">
        <h1 className="mb-1 font-serif text-2xl text-forest">Publish Article</h1>
        <p className="mb-6 text-sm text-gray-500">Upload a Word doc to publish it as an article</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-forest">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm focus:border-saffron focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-forest">
              Article title <span className="text-gray-400">(optional — auto-generated if blank)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. How to Get Your IRP Card in Dublin"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm focus:border-saffron focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-forest">
              URL slug <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. how-to-get-irp-card"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm focus:border-saffron focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">Lowercase, hyphens only. This becomes the article URL.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-forest">
              Word document (.docx) <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              accept=".docx"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-saffron/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-saffron-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-forest">
              Cover image <span className="text-red-400">*</span> <span className="text-gray-400">(JPG or PNG, ideally 1200×800)</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setImage(f)
                if (f) setImagePreview(URL.createObjectURL(f))
                else setImagePreview(null)
              }}
              className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-saffron/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-saffron-dark focus:outline-none"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Cover preview"
                className="mt-3 h-36 w-full rounded-lg object-cover"
              />
            )}
          </div>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm ${status === 'success' ? 'bg-emerald/10 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !file || !image || !slug.trim()}
            className="w-full rounded-lg bg-saffron px-4 py-3 font-semibold text-white hover:bg-saffron-dark disabled:opacity-50"
          >
            {status === 'loading' ? 'Publishing…' : 'Publish Article'}
          </button>
        </form>
      </div>
    </div>
  )
}
