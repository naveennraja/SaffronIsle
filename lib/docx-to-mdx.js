// @ts-check
/**
 * Shared .docx -> MDX conversion.
 *
 * Used by both publishing paths:
 *   - app/api/admin/upload/route.ts  (web upload, pushes to GitHub)
 *   - scripts/process-drafts.js      (nightly cron, writes to disk)
 *
 * This module returns DATA, never side effects — the caller decides where the
 * markdown and the collected image buffers go. CommonJS so the plain-JS script
 * can require() it and the TS route can import it (tsconfig has allowJs).
 *
 * Images embedded in the Word document are extracted at the position the author
 * placed them and emitted as <ArticleImage /> blocks. See CONVERSION NOTES at
 * the bottom for why the pipeline is shaped this way.
 */

const mammoth = require('mammoth')
const { imageSize } = require('image-size')

/** Formats a browser can actually display. Word also emits x-emf/x-wmf for
 *  pasted charts and shapes, and mammoth's own supportedImageTypes list is
 *  wrong in both directions (omits webp, includes tiff), so we keep our own.
 *  @type {Record<string, string>} */
const ALLOWED_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/** Word litters documents with tiny spacer and bullet artifacts. */
const MIN_DIMENSION = 32

const SENTINEL_RE = /@@SI_IMG_(\d+)@@/g

/**
 * Builds a mammoth convertImage handler that collects image buffers instead of
 * inlining them as base64 data URIs (mammoth's default).
 *
 * mammoth resolves these sequentially in document order, so the closure counter
 * yields stable 01, 02, 03… numbering. Do no network I/O in here — it would
 * serialise. Collect now, upload later.
 */
/** @param {string} slug */
function createImageCollector(slug) {
  /** @type {{path: string, publicPath: string, buffer: Buffer, width: number, height: number}[]} */
  const images = []
  /** @type {{skippedFormats: string[], unreadable: number, missingAlt: number}} */
  const stats = { skippedFormats: [], unreadable: 0, missingAlt: 0 }
  let index = 0

  const convertImage = mammoth.images.imgElement(async (image) => {
    // mammoth's types omit altText, though body-reader.js reads it from the
    // docx `descr` attribute (falling back to `title`).
    const element = /** @type {typeof image & {altText?: string}} */ (image)

    const ext = ALLOWED_TYPES[element.contentType]
    if (!ext) {
      stats.skippedFormats.push(element.contentType)
      // mammoth's html module isn't publicly exported, so we can't return [] to
      // drop the element. Emit an empty src and strip it in replaceImgTags().
      return { src: '' }
    }

    const buffer = await element.readAsBuffer()

    /** @type {{width?: number, height?: number} | null} */
    let dimensions
    try {
      dimensions = imageSize(buffer)
    } catch {
      dimensions = null
    }

    if (!dimensions || !dimensions.width || !dimensions.height) {
      stats.unreadable += 1
      return { src: '' }
    }

    if (dimensions.width < MIN_DIMENSION && dimensions.height < MIN_DIMENSION) {
      return { src: '' }
    }

    index += 1
    const filename = `${String(index).padStart(2, '0')}.${ext}`
    const publicPath = `/images/articles/${slug}/${filename}`

    if (!element.altText) stats.missingAlt += 1

    images.push({
      path: `public/images/articles/${slug}/${filename}`,
      publicPath,
      buffer,
      width: dimensions.width,
      height: dimensions.height,
    })

    // width/height ride along as <img> attributes via mammoth's attribute merge,
    // so replaceImgTags() can read them back without re-measuring.
    return {
      src: publicPath,
      width: String(dimensions.width),
      height: String(dimensions.height),
    }
  })

  return { convertImage, images, stats }
}

/** @type {Record<string, string>} */
const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

/**
 * One pass, not six chained ones: decoding `&amp;` first and `&lt;` after turns
 * the literal text `&amp;lt;` into a `<`, which is exactly the character we go
 * to some trouble below not to emit.
 * @param {string} text
 */
function decodeEntities(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
}

/**
 * Escapes a value for use inside a double-quoted MDX/JSX string attribute.
 * MDX decodes HTML entities in attribute values, so this round-trips exactly.
 * @param {string} text
 */
function escapeAttribute(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Swaps every <img> for an inert, newline-free token BEFORE the regex chain
 * runs, stashing the JSX it should become. Keeps the chain untouched.
 */
/**
 * @param {string} html
 * @param {string[]} store
 */
function replaceImgTags(html, store) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = (/\bsrc="([^"]*)"/i.exec(tag) || [])[1]
    if (!src) return '' // skipped image — drop it entirely

    const rawAlt = (/\balt="([^"]*)"/i.exec(tag) || [])[1] || ''
    const alt = decodeEntities(rawAlt)
    const width = (/\bwidth="(\d+)"/i.exec(tag) || [])[1]
    const height = (/\bheight="(\d+)"/i.exec(tag) || [])[1]

    if (!width || !height) return ''

    const position = store.length
    // Attributes MUST be literal strings, not {expressions}. next-mdx-remote
    // strips every {...} from MDX by default (its removeJavaScriptExpressions
    // plugin, blockJS: true), which silently drops expression attributes and
    // leaves the component with no props at all. ArticleImage coerces the
    // numeric ones back. See CONVERSION NOTES.
    store.push(
      `<ArticleImage src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" ` +
        `width="${width}" height="${height}" />`
    )
    return `@@SI_IMG_${position}@@`
  })
}

/**
 * Expands tokens back into standalone JSX blocks AFTER the chain has run.
 *
 * Line-oriented so an image inside a list item or wrapped in a link still ends
 * up as a valid top-level block. MDX only treats JSX as a sibling of the
 * paragraphs (rather than nesting it inside <p>) when it stands alone
 * surrounded by blank lines — hence the padding.
 */
/**
 * @param {string} markdown
 * @param {string[]} store
 */
function expandSentinels(markdown, store) {
  return markdown
    .split('\n')
    .reduce(/** @param {string[]} lines @param {string} line */ (lines, line) => {
      SENTINEL_RE.lastIndex = 0
      if (!SENTINEL_RE.test(line)) {
        lines.push(line)
        return lines
      }

      // Undo [@@SI_IMG_0@@](url) produced by the <a> rule, which runs earlier.
      const unwrapped = line.replace(
        /\[\s*(@@SI_IMG_\d+@@)\s*\]\([^)]*\)/g,
        '$1'
      )

      const tokens = unwrapped.match(/@@SI_IMG_\d+@@/g) || []
      const text = unwrapped
        .replace(/@@SI_IMG_\d+@@/g, '')
        .replace(/^[-*]\s+/, '') // drop the list marker if the item held only an image
        .trim()

      if (text) lines.push(text, '')

      for (const token of tokens) {
        const digits = /\d+/.exec(token)
        if (!digits) continue
        const jsx = store[Number(digits[0])]
        if (jsx) lines.push(jsx, '')
      }

      return lines
    }, /** @type {string[]} */ ([]))
    .join('\n')
}

/**
 * Converts one table cell's inner HTML to a single line of markdown-ish text.
 * Sentinel image tokens (already stashed by replaceImgTags, so an image inside
 * a cell resolves the same way one outside a table would) are resolved here
 * rather than left for expandSentinels, because by the time the table sentinel
 * itself expands, this text is opaque content — expandSentinels never looks
 * inside it.
 * @param {string} cellHtml
 * @param {string[]} imgStore
 */
function cellToMarkdown(cellHtml, imgStore) {
  return cellHtml
    .replace(/<\/p>/gi, ' ')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/@@SI_IMG_(\d+)@@/g, (_m, idx) => imgStore[Number(idx)] || '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Renders one <table> as a GFM markdown table, treating the first row as the
 * header — Word's table markup carries no header/body distinction, and a
 * markdown table requires a separator row regardless.
 * @param {string} tableHtml
 * @param {string[]} imgStore
 */
function convertTable(tableHtml, imgStore) {
  /** @type {string[][]} */
  const rows = []
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  while ((rowMatch = rowRe.exec(tableHtml))) {
    /** @type {string[]} */
    const cells = []
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      cells.push(cellToMarkdown(cellMatch[1], imgStore))
    }
    if (cells.length > 0) rows.push(cells)
  }

  if (rows.length === 0) return ''

  const colCount = Math.max(...rows.map((r) => r.length))
  /** @param {string[]} row */
  const pad = (row) => {
    const padded = row.slice(0, colCount)
    while (padded.length < colCount) padded.push('')
    return padded
  }

  const [header, ...body] = rows.map(pad)
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
}

/**
 * Swaps every <table> for an inert token before the regex chain runs, same
 * trick as replaceImgTags and for the same reason — the chain has no table
 * rule, so left alone a table's <tr>/<td> tags would just fall through the
 * catch-all tag-stripper and its cells would run together as one paragraph.
 * @param {string} html
 * @param {string[]} imgStore
 * @param {string[]} tableStore
 */
function replaceTableTags(html, imgStore, tableStore) {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
    const md = convertTable(match, imgStore)
    if (!md) return ''
    const position = tableStore.length
    tableStore.push(md)
    return `\n\n@@SI_TBL_${position}@@\n\n`
  })
}

/**
 * @param {string} markdown
 * @param {string[]} tableStore
 */
function expandTableSentinels(markdown, tableStore) {
  return markdown.replace(
    /@@SI_TBL_(\d+)@@/g,
    (_m, idx) => tableStore[Number(idx)] || ''
  )
}

/** @param {string} html */
function htmlToMarkdown(html) {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/ul>\s*<ul[^>]*>/gi, '\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    // A bare `<` is the one character a writer can type in Word that reliably
    // breaks the MDX compile — "Salaries <2000 euro" reads as the start of a
    // JSX tag. Emit the reference instead; MDX decodes it back to `<` when it
    // renders, so the reader sees what was typed. The publish paths compile the
    // result anyway (lib/mdx-check.js); this is the layer that means it passes.
    .replace(/</g, '&lt;')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** @param {string} markdown */
function extractDescription(markdown) {
  const firstPara = markdown
    .split('\n\n')
    .map(/** @param {string} p */ (p) => p.trim())
    // The `<` guard keeps an <ArticleImage /> block from becoming the meta
    // description when an article opens with a picture.
    .find((p) => p && !p.startsWith('#') && !p.startsWith('-') && !p.startsWith('<'))

  if (!firstPara) return ''

  // Decoded, not escaped: this becomes a <meta> description, which is plain
  // text — an `&lt;` left in would be shown to searchers as those four
  // characters rather than as `<`.
  return decodeEntities(firstPara.replace(/[*_`]/g, ''))
    .slice(0, 155)
    .trim()
}

/**
 * Turns collected stats into messages an author can act on.
 * @param {{skippedFormats: string[], unreadable: number, missingAlt: number}} stats
 */
function buildWarnings(stats) {
  /** @type {string[]} */
  const warnings = []

  if (stats.skippedFormats.length > 0) {
    const n = stats.skippedFormats.length
    warnings.push(
      `${n} picture${n === 1 ? '' : 's'} couldn't be used — Word saved ${n === 1 ? 'it' : 'them'} ` +
        `in a format browsers can't show (this happens with charts and shapes). ` +
        `In Word: copy the picture, then Paste Special → Picture (PNG), and re-upload.`
    )
  }

  if (stats.unreadable > 0) {
    const n = stats.unreadable
    warnings.push(
      `${n} picture${n === 1 ? '' : 's'} couldn't be read and ${n === 1 ? 'was' : 'were'} skipped.`
    )
  }

  if (stats.missingAlt > 0) {
    const n = stats.missingAlt
    warnings.push(
      `${n} picture${n === 1 ? '' : 's'} ${n === 1 ? 'has' : 'have'} no description. ` +
        `In Word: right-click the picture → Edit Alt Text. This helps blind readers and Google.`
    )
  }

  return warnings
}

/**
 * Converts a .docx into MDX body markdown plus the images it embedded.
 *
 * @param {{buffer?: Buffer, path?: string, slug: string}} input
 * @returns {Promise<{
 *   markdown: string,
 *   description: string,
 *   images: {path: string, publicPath: string, buffer: Buffer, width: number, height: number}[],
 *   warnings: string[],
 *   messages: {type: string, message: string}[],
 * }>}
 */
async function convertDocx({ buffer, path: filePath, slug }) {
  if (!buffer && !filePath) {
    throw new Error('convertDocx needs either a buffer or a path')
  }

  const { convertImage, images, stats } = createImageCollector(slug)

  const source = buffer
    ? { buffer }
    : { path: /** @type {string} */ (filePath) }
  const { value: html, messages } = await mammoth.convertToHtml(source, {
    convertImage,
  })

  /** @type {string[]} */
  const store = []
  const withImgTokens = replaceImgTags(html, store)

  /** @type {string[]} */
  const tableStore = []
  const withTokens = replaceTableTags(withImgTokens, store, tableStore)

  const converted = htmlToMarkdown(withTokens)
  const markdown = expandTableSentinels(expandSentinels(converted, store), tableStore)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    markdown,
    description: extractDescription(markdown),
    images,
    warnings: buildWarnings(stats),
    // mammoth swallows convertImage errors into messages via
    // recoveringConvertImage, so a failing image is invisible without this.
    messages: messages || [],
  }
}

module.exports = { convertDocx, htmlToMarkdown, extractDescription }

/*
 * CONVERSION NOTES
 *
 * The <img> handling brackets the regex chain rather than joining it, because
 * slotting a rule in the middle breaks in three separate ways:
 *
 *   1. mammoth emits <p><img/></p> on a single line, and the <p> rule is
 *      non-greedy and not s-flagged — injecting "\n\n" mid-chain glues
 *      neighbouring paragraphs together.
 *   2. The <a href> rule runs before <p>, so a hyperlinked image becomes
 *      [<ArticleImage/>](url).
 *   3. The catch-all /<[^>]+>/g at the end eats anything left over.
 *
 * So: tokenise before, run the chain untouched, expand after.
 *
 * The emitted <ArticleImage> uses plain string attributes rather than JSX
 * expressions. next-mdx-remote v6 runs removeJavaScriptExpressions over every
 * document by default, stripping all {...} attribute values — an image written
 * as src={"..."} silently renders with no src, no dimensions and no alt.
 * Literal strings are the only attribute form that survives, so alt text is
 * HTML-escaped here and decoded back by MDX, and ArticleImage turns the
 * width/height strings into numbers.
 */
