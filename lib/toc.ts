import { isValidElement, type ReactNode } from 'react'

/**
 * Heading identity, owned in one place.
 *
 * Two callers derive it from different inputs — this module reads the raw MDX to
 * build the contents list, lib/mdx-components.tsx has React children in hand
 * when it stamps the id onto the rendered <h2>/<h3> — and the anchor only works
 * if both land on the same string. They were separate implementations once, and
 * they drifted: every formatted heading on a published article rendered
 * id="object-object" while the TOC linked to slugs that existed nowhere on the
 * page. Both paths now end in slugifyHeading below.
 */

export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

/** Matches setext-free ATX headings at h2/h3 — the two levels the TOC shows. */
const HEADING = /^(#{2,3})\s+(.+)$/gm

/**
 * The id a heading gets, and the anchor the table of contents links to.
 *
 * Note the deliberate omission: no de-duplicating suffix. The renderer sees one
 * heading at a time with no memory of the others, so a counter here could not be
 * reproduced there, and the two would drift again. Two headings with identical
 * text therefore share an id and the browser jumps to the first — a smaller
 * problem than the one it would cause.
 */
export function slugifyHeading(text: string): string {
  return text
    .replace(/[#*`]/g, '')
    .trim()
    .toLowerCase()
    // \w is ASCII-only, so accented characters are dropped rather than folded:
    // "Café" becomes "caf". Both sides agree on that, which is what matters.
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/** Strips the inline markdown a heading may carry, leaving its plain text. */
function headingText(raw: string): string {
  return raw.replace(/[#*`]/g, '').trim()
}

/**
 * The plain text inside a rendered heading, however deeply it is wrapped.
 *
 * A heading is rarely a bare string: `## **Career Help**` arrives as an array
 * holding a <strong> element, and the obvious `children.join('')` stringifies
 * that to "[object Object]". Recursing to the leaves is what makes the rendered
 * id match the one extractTocFromMdx derived from the same heading's source.
 */
export function headingIdFromChildren(children: ReactNode): string {
  return slugifyHeading(childrenToText(children))
}

function childrenToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childrenToText).join('')
  if (isValidElement(node)) {
    return childrenToText((node.props as { children?: ReactNode }).children)
  }
  return ''
}

export function extractTocFromMdx(content: string): TocItem[] {
  const items: TocItem[] = []

  for (const match of content.matchAll(HEADING)) {
    const level = match[1].length as 2 | 3
    const text = headingText(match[2])
    if (!text) continue
    items.push({ id: slugifyHeading(text), text, level })
  }

  return items
}
