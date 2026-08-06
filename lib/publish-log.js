// @ts-check
/**
 * Shared shape of drafts/publish-log.md.
 *
 * Both publishing paths append a row to this table, and both used to carry
 * their own copy of the header string and their own row template. The header in
 * particular has to match byte for byte — the web path prepends it only when
 * the file is missing, so a drifted copy would produce a second header block
 * partway down the file rather than an obvious error.
 *
 * CommonJS, matching the other shared modules, so scripts/process-drafts.js can
 * require() it and the TS route can import it.
 */

const PUBLISH_LOG_PATH = 'drafts/publish-log.md'

const PUBLISH_LOG_HEADER =
  '# Publish Log\n\n' +
  'All articles published through the drafts pipeline.\n\n' +
  '| Date | Title | Category | Slug |\n' +
  '|---|---|---|---|\n'

/**
 * One table row, newline-terminated.
 *
 * Pipes in a title would break the column layout, so they are escaped rather
 * than silently corrupting the table.
 *
 * @param {{ date: string, title: string, category: string, slug: string }} entry
 */
function publishLogRow({ date, title, category, slug }) {
  const cell = (/** @type {string} */ value) => String(value).replace(/\|/g, '\\|')
  return `| ${cell(date)} | ${cell(title)} | ${cell(category)} | ${cell(slug)} |\n`
}

module.exports = { PUBLISH_LOG_PATH, PUBLISH_LOG_HEADER, publishLogRow }
