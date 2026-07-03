import { getSitemapIndexEntries, renderSitemapIndex } from '@/lib/seo/sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  const entries = await getSitemapIndexEntries()

  return new Response(renderSitemapIndex(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
