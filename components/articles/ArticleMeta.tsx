import { Calendar, Clock, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ArticleMeta as ArticleMetaType } from '@/lib/types'

interface ArticleMetaProps {
  article: ArticleMetaType
  showCity?: boolean
}

export function ArticleMeta({ article, showCity = true }: ArticleMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-forest/50">
      <span className="flex items-center gap-1">
        <span className="sr-only">Author: </span>
        {article.author}
      </span>
      <span className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        <time dateTime={article.date}>{formatDate(article.date)}</time>
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {article.readTime} min read
      </span>
      {showCity && article.city && article.city !== 'all' && (
        <span className="flex items-center gap-1 capitalize">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {article.city}
        </span>
      )}
    </div>
  )
}
