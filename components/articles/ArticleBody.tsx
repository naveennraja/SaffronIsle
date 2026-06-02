import { MDXRemote } from 'next-mdx-remote/rsc'
import { mdxComponents } from '@/lib/mdx-components'

interface ArticleBodyProps {
  content: string
}

export function ArticleBody({ content }: ArticleBodyProps) {
  return (
    <div className="prose-saffron">
      <MDXRemote source={content} components={mdxComponents} />
    </div>
  )
}
