import { CreatorWorkflowsArticle } from '@/components/blog/creator-workflows-article'
import { creatorArticleMetadata } from '@/lib/blog/creator-workflows'

export const metadata = creatorArticleMetadata('en')

export default function CreatorSkillsBlogPage() {
  return <CreatorWorkflowsArticle locale="en" />
}
