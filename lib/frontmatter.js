// @ts-check
/**
 * Shared MDX frontmatter construction.
 *
 * Used by both publishing paths:
 *   - app/api/admin/upload/route.ts  (web upload, pushes to GitHub)
 *   - scripts/process-drafts.js      (nightly cron, writes to disk)
 *
 * Both used to build this block with their own template literal, which meant
 * the same escaping bug in two places. CommonJS to match lib/docx-to-mdx.js,
 * so the plain-JS script can require() it and the TS route can import it.
 *
 * WHY THE VALUES GO THROUGH JSON.stringify
 *
 * These strings come from author input — a title typed into the admin form, a
 * description lifted from the first paragraph of a Word document. Interpolating
 * them raw into `title: "${title}"` breaks the moment one contains a double
 * quote:
 *
 *     description: "She said "come to Ireland" and I did."
 *
 * That is not valid YAML, and the failure is not local to the article. Every
 * page calls getArticles(), and lib/articles.ts parses all files with no
 * per-file recovery — so one unparseable article throws during the build and
 * takes the whole site's deploy with it. Publishing writes straight to main,
 * so the author's next article is what breaks production.
 *
 * YAML 1.2 is a superset of JSON, and its double-quoted scalars use the same
 * escapes, so JSON.stringify output is always a valid YAML scalar. It also
 * covers backslashes, newlines and control characters, not just quotes.
 */

/**
 * @param {{
 *   title: string,
 *   slug: string,
 *   category: string,
 *   description: string,
 *   date: string,
 *   metaTitle?: string,
 *   imageExt?: string,
 *   author?: string,
 *   readTime?: number,
 *   featured?: boolean,
 * }} fields
 * @returns {string} the fenced frontmatter block, without a trailing newline
 */
function buildFrontmatter({
  title,
  slug,
  category,
  description,
  date,
  metaTitle = '',
  imageExt = 'jpg',
  author = 'Nethra Bhaskar',
  readTime = 5,
  featured = false,
}) {
  // q() for anything author-supplied. Numbers and booleans are emitted bare so
  // they stay typed rather than arriving as strings.
  const q = JSON.stringify

  return [
    '---',
    `title: ${q(title)}`,
    // Omitted entirely when blank rather than written as "". An empty string is
    // truthy enough to be mistaken for a deliberate choice downstream, and the
    // reader falls back to `title` only when the key is absent.
    ...(metaTitle.trim() ? [`metaTitle: ${q(metaTitle.trim())}`] : []),
    `description: ${q(description)}`,
    `date: ${q(date)}`,
    `category: ${q(category)}`,
    `author: ${q(author)}`,
    `coverImage: ${q(`/images/articles/${slug}.${imageExt}`)}`,
    `coverAlt: ${q(title)}`,
    `readTime: ${readTime}`,
    `featured: ${featured}`,
    '---',
  ].join('\n')
}

module.exports = { buildFrontmatter }
