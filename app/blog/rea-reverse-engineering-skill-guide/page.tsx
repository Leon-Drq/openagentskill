import { ReaGuideArticle } from '@/components/blog/rea-guide-article'
import { reaArticleMetadata } from '@/lib/blog/rea-guide'

export const metadata = reaArticleMetadata('en')
export default function ReaBlogPage() { return <ReaGuideArticle locale="en" /> }
