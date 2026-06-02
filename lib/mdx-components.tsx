import { Callout } from '@/components/mdx/Callout'
import { ChecklistItem } from '@/components/mdx/ChecklistItem'
import { AffiliateCTA } from '@/components/mdx/AffiliateCTA'

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

function createHeading(level: 2 | 3) {
  const Tag = `h${level}` as 'h2' | 'h3'
  const className =
    level === 2
      ? 'mt-10 mb-4 font-serif text-h2 text-forest scroll-mt-24'
      : 'mt-8 mb-3 font-serif text-h3 text-forest scroll-mt-24'

  return function Heading({ children }: { children?: React.ReactNode }) {
    const text =
      typeof children === 'string'
        ? children
        : Array.isArray(children)
          ? children.join('')
          : String(children ?? '')
    const id = slugifyHeading(text)
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    )
  }
}

export const mdxComponents = {
  Callout,
  ChecklistItem,
  AffiliateCTA,
  h2: createHeading(2),
  h3: createHeading(3),
}
