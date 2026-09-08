import { notFound } from 'next/navigation'
import { sitemapUnavailableResponse } from '@/lib/seo/sitemap-response'
import {
  getBestSitemapEntries,
  getCoreSitemapEntries,
  getGuideSitemapEntries,
  getCreatorSitemapEntries,
  getRankingSitemapEntries,
  getSkillSitemapEntries,
  renderUrlSet,
  type SitemapSection,
} from '@/lib/seo/sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const SHARDED_SECTION_PREFIXES: Array<[RegExp, SitemapSection]> = [
  [/^skills-(\d+)\.xml$/, 'skills'],
]

const RETIRED_SHARDED_SITEMAPS = /^(skill-audits|skill-evals|alternatives)-(\d+)\.xml$/

async function staticEntriesFor(section: string) {
  switch (section) {
    case 'core.xml':
      return getCoreSitemapEntries()
    case 'best.xml':
      return getBestSitemapEntries()
    case 'rankings.xml':
      return getRankingSitemapEntries()
    case 'guides.xml':
      return getGuideSitemapEntries()
    case 'creators.xml':
      return getCreatorSitemapEntries()
    default:
      return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params
  const staticEntries = await staticEntriesFor(section).catch(() => undefined)
  if (staticEntries === undefined) return sitemapUnavailableResponse()

  if (staticEntries) {
    // Only entries with a source-backed content date emit lastmod.
    return xmlResponse(renderUrlSet(staticEntries))
  }

  // Audit, eval, and generic alternative pages remain available to people and
  // agents, but they are no longer part of the public crawl budget. A 410 tells
  // crawlers that old child sitemaps were intentionally retired.
  if (RETIRED_SHARDED_SITEMAPS.test(section)) {
    return new Response('', {
      status: 410,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Robots-Tag': 'noindex',
      },
    })
  }

  for (const [pattern, sitemapSection] of SHARDED_SECTION_PREFIXES) {
    const match = section.match(pattern)
    if (!match) continue

    const index = Number(match[1])
    if (!Number.isSafeInteger(index) || index < 0 || String(index) !== match[1]) notFound()

    const entries = await getSkillSitemapEntries(sitemapSection, index).catch(() => null)
    if (!entries) return sitemapUnavailableResponse()
    if (entries.length === 0) notFound()

    return xmlResponse(renderUrlSet(entries))
  }

  notFound()
}

function xmlResponse(body: string) {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
