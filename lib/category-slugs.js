// @ts-check
/**
 * The canonical set of article category slugs.
 *
 * This list is the single source of truth. lib/categories.ts builds its richer
 * CATEGORIES array (labels, icons, colours) on top of it and asserts the two
 * agree, so a slug can never exist in one place and not the other.
 *
 * CommonJS, matching lib/frontmatter.js and lib/docx-to-mdx.js, so that
 * scripts/process-drafts.js can require() it and both the TS route and
 * lib/categories.ts can import it.
 *
 * WHY THIS IS SHARED RATHER THAN COPIED
 *
 * Three places validate a category before an article is written:
 *
 *   - app/api/admin/upload/route.ts  (web upload)
 *   - scripts/process-drafts.js      (nightly cron)
 *   - lib/articles.ts                (reading articles back, at build time)
 *
 * Each used to keep its own copy of the list. lib/articles.ts *throws* on an
 * unrecognised category, and it has no per-file recovery — so if a writer's
 * copy ever accepted a slug the reader did not know, the publish would appear
 * to succeed, the commit would land on main, and the next build would fail and
 * take the whole site's deploy with it. The author would have no way to connect
 * the broken deploy to the article they just published.
 */

/** @type {readonly string[]} */
const CATEGORY_SLUGS = Object.freeze([
  'visa',
  'student-life',
  'food-groceries',
  'work-careers',
  'finances',
  'housing',
  'explore-ireland',
  'community-stories',
])

/**
 * Slug rule shared by both publishing paths. The slug becomes a path segment
 * for the .mdx file and for any images extracted from the document, so it must
 * not be able to escape its folder.
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/

/** @param {string} slug */
function isValidCategory(slug) {
  return CATEGORY_SLUGS.includes(slug)
}

/** @param {string} slug */
function isValidSlug(slug) {
  return SLUG_PATTERN.test(slug)
}

/**
 * Turns an article slug into a title: 'irp-card-guide' -> 'Irp Card Guide'.
 * @param {string} slug
 */
function slugToTitle(slug) {
  return slug
    .split('-')
    .map(/** @param {string} word */ (word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

module.exports = {
  CATEGORY_SLUGS,
  SLUG_PATTERN,
  isValidCategory,
  isValidSlug,
  slugToTitle,
}
