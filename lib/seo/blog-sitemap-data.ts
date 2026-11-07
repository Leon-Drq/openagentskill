import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { readPublishedBlogSitemap } from '@/lib/blog/read'

// Cache only complete successful reads; a refresh failure retains the previous
// generation, and a cold failure reaches the route's retryable 503 response.
export const getPublishedBlogSitemap = unstable_cache(
  () => readPublishedBlogSitemap(createPublicClient()),
  ['published-blog-sitemap-v1'],
  { revalidate: 14400, tags: ['published-blog-sitemap'] },
)
