/**
 * Inline formatting for Ask Saffron Isle answers: **bold** and Markdown links.
 *
 * Returns tokens, not HTML, so the panel renders them as React elements and
 * nothing the model writes can become markup. Only links to this site's own
 * articles and categories become links; anything else — another site, a
 * javascript: URL — is shown as its label alone.
 */

export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; text: string; href: string }

const INTERNAL_PATH = /^\/(articles|category)\/[a-z0-9-]+\/?$/

export function isInternalPath(href: string): boolean {
  return INTERNAL_PATH.test(href)
}

const PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let last = 0
  for (const match of text.matchAll(PATTERN)) {
    const index = match.index ?? 0
    if (index > last) tokens.push({ type: 'text', text: text.slice(last, index) })
    const [, label, href, bold] = match
    if (bold !== undefined) {
      tokens.push({ type: 'bold', text: bold })
    } else if (isInternalPath(href)) {
      tokens.push({ type: 'link', text: label.replace(/\*\*/g, ''), href })
    } else {
      tokens.push({ type: 'text', text: label })
    }
    last = index + match[0].length
  }
  if (last < text.length) tokens.push({ type: 'text', text: text.slice(last) })
  return tokens
}
