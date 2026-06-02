export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

export function extractTocFromMdx(content: string): TocItem[] {
  const items: TocItem[] = []
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length as 2 | 3
    const text = match[2].replace(/[#*`]/g, '').trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
    items.push({ id, text, level })
  }

  return items
}

export function injectHeadingIds(content: string): string {
  return content.replace(/^(#{2,3})\s+(.+)$/gm, (_, hashes: string, title: string) => {
    const id = title
      .replace(/[#*`]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
    return `${hashes} ${title} {#${id}}`
  })
}
