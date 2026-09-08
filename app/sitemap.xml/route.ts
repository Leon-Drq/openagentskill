import { getSitemapIndexEntries, renderSitemapIndex } from '@/lib/seo/sitemap'
import { sitemapUnavailableResponse } from '@/lib/seo/sitemap-response'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  const entries = await getSitemapIndexEntries().catch(() => null)
  if (!entries) return sitemapUnavailableResponse()

  return new Response(renderSitemapIndex(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
