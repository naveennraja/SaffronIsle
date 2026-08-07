import {
  getAllArticles,
  getFeaturedArticles,
  getArticlesByCategory,
} from '@/lib/articles'
import { HeroSection } from '@/components/home/HeroSection'
import { FeaturedArticles } from '@/components/home/FeaturedArticles'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { RecentArticlesSection } from '@/components/home/RecentArticlesSection'
import { CommunityStrip } from '@/components/home/CommunityStrip'
import { NewsletterBanner } from '@/components/ui/NewsletterBanner'
import { NEWSLETTER_ENABLED } from '@/lib/site-config'

export default function HomePage() {
  const featured = getFeaturedArticles(3)
  const recent = getAllArticles().slice(0, 6)
  const communityStories = getArticlesByCategory('community-stories')

  return (
    <>
      <HeroSection />
      <RecentArticlesSection articles={recent} />
      <FeaturedArticles articles={featured} />
      <CategoryGrid />
      <CommunityStrip stories={communityStories} />
      {NEWSLETTER_ENABLED && <NewsletterBanner />}
    </>
  )
}
