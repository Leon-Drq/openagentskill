import { getSitemapIndexEntries, renderSitemapIndex } from '@/lib/seo/sitemap'
import { sitemapUnavailableResponse } from '@/lib/seo/sitemap-response'
import { getSkillSitemapSnapshot } from '@/lib/seo/skill-sitemap-data'

export const dynamic = 'force-dynamic'
export const revalidate = 3600
export const maxDuration = 120

export async function GET() {
  const snapshot = await getSkillSitemapSnapshot().catch(() => null)
  if (!snapshot) return sitemapUnavailableResponse()
  const entries = await getSitemapIndexEntries(snapshot)

  return new Response(renderSitemapIndex(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Sitemap-Snapshot': snapshot.generatedAt,
    },
  })
}
