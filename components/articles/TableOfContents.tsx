import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

interface TableOfContentsProps {
  items: TocItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Table of contents" className="hidden lg:block">
      <p className="mb-3 text-label font-semibold uppercase tracking-widest text-saffron-dark">
        On this page
      </p>
      <ul className="space-y-1 border-l-2 border-mist pl-4">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'block rounded-r-lg py-0.5 text-small text-gray-500 no-underline transition-colors hover:bg-emerald-light/30 hover:text-emerald',
                item.level === 3 ? 'pl-3 text-xs' : 'font-medium'
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
