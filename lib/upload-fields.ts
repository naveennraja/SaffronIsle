/**
 * The multipart field names the publish form sends and the admin route reads.
 *
 * Deliberately its own module, with no 'server-only' and no imports: the two
 * sides of this contract are a browser and a serverless function, so anything
 * shared between them has to be importable from both.
 *
 * They were plain string literals written out twice — once in
 * app/admin/useArticleUpload.ts, once in app/api/admin/upload/route.ts. Nothing
 * checked that the two lists matched. Renaming one side would have typechecked,
 * linted, tested and built cleanly, and the only symptom would be an article
 * published with that field silently empty. Importing the names means a rename
 * breaks the build instead.
 */
export const UPLOAD_FIELDS = {
  file: 'file',
  image: 'image',
  category: 'category',
  slug: 'slug',
  title: 'title',
  metaTitle: 'metaTitle',
  metaDescription: 'metaDescription',
  publishDate: 'publishDate',
} as const
