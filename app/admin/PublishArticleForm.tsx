'use client'

import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react'
// All categories, not VISIBLE_CATEGORIES — publishing into an empty category is
// exactly how it stops being empty.
import { CATEGORIES } from '@/lib/categories'
import AdminShell, {
  AdminTopBar,
  AdminSection,
  AdminField,
  AdminCounter,
  inputClass,
  fileInputClass,
  primaryButtonClass,
} from './AdminShell'
import { useArticleUpload } from './useArticleUpload'

const META_TITLE_LIMIT = 60
const META_DESCRIPTION_LIMIT = 155

/** `topBarActions` is the tab switch and sign-out button, owned by AdminWorkspace. */
export default function PublishArticleForm({ topBarActions }: { topBarActions: ReactNode }) {
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
  } = useArticleUpload()

  const normalisedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')
  const categoryLabel =
    CATEGORIES.find((c) => c.slug === category)?.label ?? category
  const isScheduled = Boolean(publishDate) && publishDate > today

  return (
    <AdminShell
      maxWidth="xl"
      topBar={
        <AdminTopBar>{topBarActions}</AdminTopBar>
      }
    >
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-forest sm:text-h1">
          {existing ? 'Replace an article' : 'Publish an article'}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Upload a Word document. It is converted to an article and committed to
          the site — live in about a minute.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Above the columns, not below them: this changes what the button does,
            and finding that out under the fold is finding out too late. */}
        {existing && (
          <AdminSection
            tone="notice"
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            title="This slug already has an article"
            description={`Publishing replaces it. Its original publish date, ${existing.date}, is kept.`}
          >
            <div className="space-y-2.5 text-sm text-forest">
              <p>
                <strong className="font-semibold">“{existing.title}”</strong> is
                currently filed under {existing.category}.
              </p>
              <p className="text-xs leading-relaxed text-forest/70">
                Anything left blank stays as it is — title, meta title, meta
                description, publish date, cover image and category all carry
                over.
                {existing.imageCount > 0 &&
                  ' Pictures the new document no longer uses will be removed.'}
              </p>
              {existing.category !== category && (
                <p className="rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-saffron-dark">
                  The category has been changed, so this article will move from{' '}
                  {existing.category} to {category}.
                </p>
              )}
            </div>
          </AdminSection>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Left column: what the article is. */}
          <div className="space-y-6">
            <AdminSection
              title="Article details"
              icon={<FileText className="h-5 w-5" aria-hidden />}
              description="Where it is filed and what it is called."
            >
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
                label="URL slug"
                required
                hint={
                  normalisedSlug ? (
                    <>
                      The article will live at{' '}
                      <span className="font-medium text-forest">
                        /articles/{normalisedSlug}
                      </span>
                      . Typing an existing slug replaces that article.
                    </>
                  ) : (
                    'Lowercase and hyphens only. This becomes the article URL — and typing an existing one replaces that article.'
                  )
                }
              >
                <input
                  type="text"
                  placeholder="how-to-get-irp-card"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  spellCheck={false}
                  className={inputClass}
                />
              </AdminField>

              <AdminField
                label="Article title"
                optional="built from the slug if blank"
              >
                <input
                  type="text"
                  placeholder="How to Get Your IRP Card in Dublin"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </AdminField>
            </AdminSection>

            <AdminSection
              title="Search appearance"
              icon={<Search className="h-5 w-5" aria-hidden />}
              description="How the article reads in Google results. Both are optional, and both are worth writing."
            >
              <AdminField
                label="Meta title"
                optional="the article title is used if blank"
                counter={
                  <AdminCounter length={metaTitle.length} limit={META_TITLE_LIMIT} />
                }
                hint="The headline in search results — a short title, not a sentence."
              >
                <input
                  type="text"
                  placeholder="IRP Card Dublin: How to Register (2026 Guide)"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className={inputClass}
                />
              </AdminField>

              <AdminField
                label="Meta description"
                optional="written from the first paragraph if blank"
                counter={
                  <AdminCounter
                    length={metaDescription.length}
                    limit={META_DESCRIPTION_LIMIT}
                  />
                }
                hint="The sentence under the headline. Worth writing: the automatic one just repeats the opening line."
              >
                <textarea
                  rows={3}
                  placeholder="What the IRP appointment actually costs, what to bring, and how long the card takes to arrive."
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className={`${inputClass} resize-y`}
                />
              </AdminField>
            </AdminSection>
          </div>

          {/* Right column: the files, then the act of publishing. */}
          <div className="space-y-6">
            <AdminSection
              title="Files"
              icon={<ImageIcon className="h-5 w-5" aria-hidden />}
              description="The document is always rebuilt from the .docx; the cover is what the article card shows."
            >
              <AdminField label="Word document (.docx)" required>
                <input
                  type="file"
                  accept=".docx"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className={fileInputClass}
                />
                {file && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-dark">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="shrink-0 text-gray-500">
                      {(file.size / 1_000_000).toFixed(1)}MB
                    </span>
                  </p>
                )}
              </AdminField>

              <AdminField
                label="Cover image"
                required={!existing}
                optional={existing ? 'keeps the current one' : undefined}
                hint="JPG or PNG, ideally 1200×800."
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
                  className={fileInputClass}
                />
                {coverWarning && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    {coverWarning}
                  </p>
                )}
                {imagePreview && (
                  // A fixed 3:2 frame, which is the shape the article card
                  // crops to — so what is previewed here is what will be seen.
                  <div className="mt-3 overflow-hidden rounded-xl border border-mist/70 bg-cream">
                    {/* Deliberately a plain <img>: this is a blob: URL from the
                        file the user just picked, which next/image cannot
                        optimise or even load. Nothing is fetched over the
                        network here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Cover preview"
                      className="aspect-[3/2] w-full object-cover"
                    />
                  </div>
                )}
              </AdminField>
            </AdminSection>

            <AdminSection
              title="Publishing"
              icon={<CalendarClock className="h-5 w-5" aria-hidden />}
              description="Leave the date blank to publish immediately."
            >
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

              {/* Reads back the decisions made in the other column, so the last
                  thing seen before publishing is what is about to happen. */}
              <dl className="space-y-1.5 rounded-xl bg-cream/60 px-4 py-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Category</dt>
                  <dd className="font-medium text-forest">{categoryLabel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">URL</dt>
                  <dd className="truncate font-medium text-forest">
                    {normalisedSlug ? `/articles/${normalisedSlug}` : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Goes live</dt>
                  <dd className="font-medium text-forest">
                    {isScheduled ? publishDate : existing ? 'On saving' : 'Immediately'}
                  </dd>
                </div>
              </dl>

              <button
                type="submit"
                disabled={isLoading || !canSubmit}
                className={primaryButtonClass}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {isLoading
                  ? existing
                    ? 'Replacing…'
                    : 'Publishing…'
                  : existing
                    ? 'Replace article'
                    : isScheduled
                      ? 'Schedule article'
                      : 'Publish article'}
              </button>

              {!canSubmit && !isLoading && (
                <p className="text-center text-xs text-gray-500">
                  {!slug.trim()
                    ? 'Add a URL slug to continue.'
                    : !file
                      ? 'Choose the Word document to continue.'
                      : 'A cover image is needed for a new article.'}
                </p>
              )}
            </AdminSection>
          </div>
        </div>

        {message && (
          <div
            // Three states, not two: the box also carries the in-progress note,
            // and styling that red would say the publish had failed.
            role="status"
            className={`flex items-start gap-2.5 rounded-2xl border px-5 py-4 text-sm leading-relaxed ${
              status === 'success'
                ? 'border-emerald/20 bg-emerald-light text-emerald-dark'
                : status === 'loading'
                  ? 'border-mist/70 bg-white text-gray-600'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {status === 'success' ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden />
              )}
            </span>
            {message}
          </div>
        )}

        {warnings.length > 0 && (
          <AdminSection
            tone="notice"
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            title="Worth a look"
            description="The article published. These are things the document did that may not have been intended."
          >
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-forest/80">
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
