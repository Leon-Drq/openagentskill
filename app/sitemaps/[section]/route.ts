import { notFound } from 'next/navigation'
import {
  getBestSitemapEntries,
  getCoreSitemapEntries,
  getGuideSitemapEntries,
  getRankingSitemapEntries,
  getSkillSitemapEntries,
  renderUrlSet,
  type SitemapSection,
} from '@/lib/seo/sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const SHARDED_SECTION_PREFIXES: Array<[RegExp, SitemapSection]> = [
  [/^skills-(\d+)\.xml$/, 'skills'],
  [/^skill-audits-(\d+)\.xml$/, 'skill-audits'],
  [/^skill-evals-(\d+)\.xml$/, 'skill-evals'],
  [/^alternatives-(\d+)\.xml$/, 'alternatives'],
]

function staticEntriesFor(section: string) {
  const now = new Date()

  switch (section) {
    case 'core.xml':
      return getCoreSitemapEntries(now)
    case 'best.xml':
      return getBestSitemapEntries(now)
    case 'rankings.xml':
      return getRankingSitemapEntries(now)
    case 'guides.xml':
      return getGuideSitemapEntries(now)
    default:
      return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  const { section } = await params
  const staticEntries = staticEntriesFor(section)

  if (staticEntries) {
    return xmlResponse(renderUrlSet(staticEntries))
  }

  for (const [pattern, sitemapSection] of SHARDED_SECTION_PREFIXES) {
    const match = section.match(pattern)
    if (!match) continue

    const index = Number(match[1])
    if (!Number.isInteger(index) || index < 0) notFound()

    const entries = await getSkillSitemapEntries(sitemapSection, index)
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
