'use client'

// All categories, not VISIBLE_CATEGORIES — publishing into an empty category is
// exactly how it stops being empty.
import { CATEGORIES } from '@/lib/categories'
import AdminShell from './AdminShell'
import { useArticleUpload } from './useArticleUpload'

type PublishArticleFormProps = {
  password: string
}

export default function PublishArticleForm({ password }: PublishArticleFormProps) {
  const {
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
    canSubmit,
    isLoading,
  } = useArticleUpload(password)

  return (
    <AdminShell>
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
              <option key={c.slug} value={c.slug}>{c.label}</option>
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
            Meta title <span className="text-gray-400">(optional — auto-generated if blank)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. This wil be an article about how to get your IRP Card in Dublin"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
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
            Publish date{' '}
            <span className="text-gray-400">(optional — publishes now if blank)</span>
          </label>
          <input
            type="date"
            value={publishDate}
            min={today}
            onChange={(e) => setPublishDate(e.target.value)}
            className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm focus:border-saffron focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            Pick a future date to write now and publish later. The article goes
            live in the early hours of that morning, not at an exact time.
          </p>
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
            onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-mist px-4 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-saffron/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-saffron-dark focus:outline-none"
          />
          {imagePreview && (
            // Deliberately a plain <img>: this is a blob: URL from the file
            // the user just picked, which next/image cannot optimise or
            // even load. Nothing is fetched over the network here.
            // eslint-disable-next-line @next/next/no-img-element
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

        {warnings.length > 0 && (
          <div className="rounded-lg bg-saffron/10 px-4 py-3 text-sm text-saffron-dark">
            <p className="mb-1 font-semibold">Worth checking:</p>
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="w-full rounded-lg bg-saffron px-4 py-3 font-semibold text-white hover:bg-saffron-dark disabled:opacity-50"
        >
          {isLoading ? 'Publishing…' : 'Publish Article'}
        </button>
      </form>
    </AdminShell>
  )
}
