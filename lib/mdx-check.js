// @ts-check
/**
 * Compiles generated MDX before it is committed.
 *
 * Without this, a document that converts cleanly but does not compile gets
 * pushed to main, the build fails, and *every* later article fails too, because
 * the bad file is still there. Nethra sees "Article published!" and the pipeline
 * is frozen in a way she cannot unfreeze, since unfreezing means editing MDX.
 *
 * So the check runs where the author is still standing in front of the form and
 * can fix the Word document. Escaping in lib/docx-to-mdx.js is the first layer;
 * this is the one that guarantees nothing broken reaches the repo.
 *
 * CommonJS, so scripts/process-drafts.js can require() it and the TS route can
 * import it. @mdx-js/mdx is ESM-only, hence the dynamic import.
 */

/**
 * Turns a compiler error into something actionable in Word.
 *
 * The raw messages talk about attribute names and closing tags, which describes
 * MDX rather than anything the author typed. Point at the character instead.
 *
 * @param {string} markdown
 * @param {{message: string, line?: number|null, column?: number|null}} error
 */
function explain(markdown, error) {
  const lineNo = error.line ?? 0
  const line = lineNo ? (markdown.split('\n')[lineNo - 1] ?? '') : ''
  // Enough context to find the sentence in Word, not so much it wraps.
  const excerpt = line.trim().slice(0, 120)
  const where = excerpt ? ` Look for: "${excerpt}"` : ''

  if (line.includes('<')) {
    const snippet = (/<\S*/.exec(line) || [])[0] ?? '<'
    // The example is the point when the "<" is a comparison and noise when it
    // already is one, so only show it in the first case.
    const example = /^<\d/.test(snippet) ? '' : ' — for example "<2000" becomes "under 2000"'
    return (
      `The document contains a "<" that breaks publishing. ` +
      `In Word, find "${snippet}" and write it in words instead${example}.${where}`
    )
  }

  if (line.includes('{')) {
    const snippet = (/\{[^}]{0,40}\}?/.exec(line) || [])[0] ?? '{'
    return (
      `The document contains a "{" that breaks publishing. ` +
      `In Word, find "${snippet}" and use ordinary brackets ( ) instead.${where}`
    )
  }

  return `The document could not be published: ${error.message}.${where}`
}

/**
 * @param {string} markdown MDX body — frontmatter must not be included, the
 *   compiler has no frontmatter plugin configured and would reject the `---`.
 * @returns {Promise<{ok: true} | {ok: false, error: string, detail: string}>}
 */
async function checkMdx(markdown) {
  const { compile } = await import('@mdx-js/mdx')
  try {
    await compile(markdown)
    return { ok: true }
  } catch (err) {
    const e = /** @type {{message?: string, line?: number, column?: number}} */ (
      err instanceof Error ? err : {}
    )
    const detail = e.message ?? String(err)
    return {
      ok: false,
      error: explain(markdown, { message: detail, line: e.line, column: e.column }),
      detail,
    }
  }
}

module.exports = { checkMdx }
