'use client'

// All categories, not VISIBLE_CATEGORIES — publishing into an empty category is
// exactly how it stops being empty.
import { CATEGORIES } from '@/lib/categories'
import AdminShell, {
  AdminSection,
  AdminField,
  inputClass,
  fileInputClass,
} from './AdminShell'
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
    existing,
    status,
    message,
    warnings,
    handleSubmit,
    canSubmit,
    isLoading,
  } = useArticleUpload(password)

  const metaTooLong = metaTitle.length > 60
  const metaDescriptionTooLong = metaDescription.length > 155

  return (
    <AdminShell maxWidth="xl">
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-forest">Publish Article</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a Word document to publish it as an article
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminSection title="Article Details">
            <AdminField label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField
              label="Article title"
              optional="auto-generated from the slug if blank"
            >
              <input
                type="text"
                placeholder="e.g. How to Get Your IRP Card in Dublin"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </AdminField>

            <AdminField
              label="Meta title"
              optional="the article title is used if blank"
              hint={
                <>
                  The headline shown in Google results — a short title, not a
                  sentence.
                  {metaTitle.length > 0 && (
                    <span className={metaTooLong ? 'ml-1 font-medium text-red-500' : 'ml-1'}>
                      {metaTitle.length}/60
                      {metaTooLong && ' — Google will cut this off'}
                    </span>
                  )}
                </>
              }
            >
              <input
                type="text"
                placeholder="e.g. IRP Card Dublin: How to Register (2026 Guide)"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className={inputClass}
              />
            </AdminField>

            <AdminField
              label="Meta description"
              optional="written from the first paragraph if blank"
              hint={
                <>
                  The sentence under the headline in Google results. Worth
                  writing: the automatic one just repeats the opening line.
                  {metaDescription.length > 0 && (
                    <span
                      className={
                        metaDescriptionTooLong ? 'ml-1 font-medium text-red-500' : 'ml-1'
                      }
                    >
                      {metaDescription.length}/155
                      {metaDescriptionTooLong && ' — Google will cut this off'}
                    </span>
                  )}
                </>
              }
            >
              <textarea
                rows={3}
                placeholder="e.g. What the IRP appointment actually costs, what to bring, and how long the card takes to arrive."
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className={inputClass}
              />
            </AdminField>

            <AdminField
              label="URL slug"
              required
              hint="Lowercase and hyphens only. This becomes the article URL — and typing an existing one replaces that article."
            >
              <input
                type="text"
                placeholder="e.g. how-to-get-irp-card"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className={inputClass}
              />
            </AdminField>
          </AdminSection>

          <AdminSection title="Publishing">
            <AdminField
              label="Publish date"
              optional="publishes now if blank"
              hint="Pick a future date to write now and publish later. The article goes live in the early hours of that morning, not at an exact time."
            >
              <input
                type="date"
                value={publishDate}
                min={today}
                onChange={(e) => setPublishDate(e.target.value)}
                className={inputClass}
              />
            </AdminField>

            <AdminField label="Word document (.docx)" required>
              <input
                type="file"
                accept=".docx"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {file && (
                <p className="mt-1 text-xs text-gray-400">
                  {file.name} — {(file.size / 1_000_000).toFixed(1)}MB
                </p>
              )}
            </AdminField>

            <AdminField
              label="Cover image"
              required={!existing}
              optional={existing ? 'keeps the current one' : undefined}
              hint="JPG or PNG, ideally 1200×800"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
                className={fileInputClass}
              />
              {coverWarning && (
                <p className="mt-2 text-xs text-amber-700">{coverWarning}</p>
              )}
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
            </AdminField>

            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="w-full rounded-lg bg-saffron px-4 py-3 font-semibold text-white hover:bg-saffron-dark disabled:opacity-50"
            >
              {isLoading
                ? existing
                  ? 'Replacing…'
                  : 'Publishing…'
                : existing
                  ? 'Replace Article'
                  : 'Publish Article'}
            </button>
          </AdminSection>
        </div>

        {existing && (
          <AdminSection title="Replace Existing Article" className="border-saffron/40 bg-saffron/5">
            <div className="space-y-2 text-sm text-saffron-dark">
              <p>
                <strong>“{existing.title}”</strong> already uses this slug, published{' '}
                {existing.date}. Publishing will replace it.
              </p>
              <p className="text-xs">
                Anything left blank stays as it is — title, meta title, meta
                description, publish date, cover image and category all carry
                over.
                {existing.category !== category && (
                  <>
                    {' '}
                    <strong>
                      The category has been changed, so this article will move from{' '}
                      {existing.category} to {category}.
                    </strong>
                  </>
                )}
                {existing.imageCount > 0 &&
                  ' Pictures the new document no longer uses will be removed.'}
              </p>
            </div>
          </AdminSection>
        )}

        {message && (
          <div
            // Three states, not two: the box now also carries the in-progress
            // note, and styling that red would say the publish had failed.
            className={`rounded-2xl px-6 py-4 text-sm ${
              status === 'success'
                ? 'bg-emerald/10 text-emerald-800'
                : status === 'loading'
                  ? 'bg-gray-50 text-gray-600'
                  : 'bg-red-50 text-red-700'
            }`}
          >
            {message}
          </div>
        )}

        {warnings.length > 0 && (
          <AdminSection title="Warnings" className="border-saffron/40 bg-saffron/5">
            <ul className="list-disc space-y-1 pl-5 text-sm text-saffron-dark">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AdminSection>
        )}
      </form>
    </AdminShell>
  )
}
