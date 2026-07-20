import { AGENT_TASKS } from '@/lib/agent-tasks'
import { withTimeout } from '@/lib/async'
import { SKILL_STACKS } from '@/lib/collections'
import {
  getApprovedSkillSitemapCount,
  getApprovedSkillSitemapRecords,
} from '@/lib/db/skills'
import { getRankingDefinitions } from '@/lib/rankings'
import { GROWTH_GUIDES } from '@/lib/seo/growth-guides'
import { AGENT_PROFILES, OFFICIAL_CREATORS } from '@/lib/seo/growth-directories'
import { BEST_SKILL_PAGES } from '@/lib/seo/growth-pages'
import { getLocalizedCorePath, LOCALIZED_CORE_PAGE_SLUGS, MARKET_LOCALES } from '@/lib/i18n/market-routing'
import {
  getLocalizedCoreLanguageAlternates,
  LOCALIZED_LANDING_PAGES,
  getLocalizedLanguageAlternates,
} from '@/lib/seo/localized-pages'
import { SKILL_CLUSTERS } from '@/lib/seo/skill-clusters'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { SKILL_PACKS } from '@/lib/skill-packs'
import { USE_CASES } from '@/lib/use-cases'

export const SITEMAP_BASE_URL = 'https://www.openagentskill.com'
export const SITEMAP_CHUNK_SIZE = 4000
const SITEMAP_SKILL_QUERY_TIMEOUT_MS = 7200

export interface SitemapEntry {
  url: string
  lastModified?: Date | string
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  alternates?: {
    languages?: Record<string, string>
  }
}

export type SitemapSection =
  | 'core'
  | 'best'
  | 'rankings'
  | 'guides'
  | 'skills'
  | 'skill-audits'
  | 'skill-evals'
  | 'alternatives'

function dateFrom(value: string | null | undefined) {
  if (!value) return new Date()
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : new Date()
}

function chunkCount(total: number) {
  return Math.max(1, Math.ceil(total / SITEMAP_CHUNK_SIZE))
}

function fallbackSkillRecords(minStars = 0) {
  return CURATED_SKILL_SNAPSHOT
    .filter((skill) => Number(skill.github_stars || 0) >= minStars)
    .map((skill) => ({
      slug: skill.slug,
      github_stars: skill.github_stars,
      github_last_pushed_at: skill.github_last_pushed_at,
      updated_at: skill.updated_at,
    }))
}

async function getSitemapSkillCount(minStars = 0) {
  return withTimeout(
    getApprovedSkillSitemapCount(minStars),
    SITEMAP_SKILL_QUERY_TIMEOUT_MS,
    `sitemap approved skills count${minStars ? ` ${minStars}+` : ''}`
  ).catch(() => {
    return fallbackSkillRecords(minStars).length
  })
}

export async function getSitemapSkillRecords(index = 0, minStars = 0) {
  const offset = Math.max(0, index) * SITEMAP_CHUNK_SIZE

  return withTimeout(
    getApprovedSkillSitemapRecords({
      offset,
      limit: SITEMAP_CHUNK_SIZE,
      minStars,
    }),
    SITEMAP_SKILL_QUERY_TIMEOUT_MS,
    `sitemap approved skills page ${index}${minStars ? ` ${minStars}+` : ''}`
  ).catch(() => {
    return fallbackSkillRecords(minStars).slice(offset, offset + SITEMAP_CHUNK_SIZE)
  })
}

export async function getSitemapIndexEntries() {
  const now = new Date()
  const [skillCount, highSignalSkillCount] = await Promise.all([
    getSitemapSkillCount(),
    getSitemapSkillCount(500),
  ])

  const fixedSections: Array<{ loc: string; lastmod: Date }> = [
    { loc: `${SITEMAP_BASE_URL}/sitemaps/core.xml`, lastmod: now },
    { loc: `${SITEMAP_BASE_URL}/sitemaps/best.xml`, lastmod: now },
    { loc: `${SITEMAP_BASE_URL}/sitemaps/rankings.xml`, lastmod: now },
    { loc: `${SITEMAP_BASE_URL}/sitemaps/guides.xml`, lastmod: now },
  ]

  const skillSections = [
    ...Array.from({ length: chunkCount(skillCount) }, (_, index) => ({
      loc: `${SITEMAP_BASE_URL}/sitemaps/skills-${index}.xml`,
      lastmod: now,
    })),
    ...Array.from({ length: chunkCount(skillCount) }, (_, index) => ({
      loc: `${SITEMAP_BASE_URL}/sitemaps/skill-audits-${index}.xml`,
      lastmod: now,
    })),
    ...Array.from({ length: chunkCount(skillCount) }, (_, index) => ({
      loc: `${SITEMAP_BASE_URL}/sitemaps/skill-evals-${index}.xml`,
      lastmod: now,
    })),
    ...Array.from({ length: chunkCount(highSignalSkillCount) }, (_, index) => ({
      loc: `${SITEMAP_BASE_URL}/sitemaps/alternatives-${index}.xml`,
      lastmod: now,
    })),
  ]

  return [...fixedSections, ...skillSections]
}

export function getCoreSitemapEntries(now = new Date()): SitemapEntry[] {
  const staticPages: SitemapEntry[] = [
    { url: SITEMAP_BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITEMAP_BASE_URL}/resolve`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${SITEMAP_BASE_URL}/skills`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/agent-skill`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/agent-skills`, lastModified: now, changeFrequency: 'weekly', priority: 0.91 },
    { url: `${SITEMAP_BASE_URL}/ai-agent-skills`, lastModified: now, changeFrequency: 'weekly', priority: 0.91 },
    { url: `${SITEMAP_BASE_URL}/skills-registry`, lastModified: now, changeFrequency: 'weekly', priority: 0.91 },
    { url: `${SITEMAP_BASE_URL}/openagentskill`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/agent`, lastModified: now, changeFrequency: 'daily', priority: 0.93 },
    { url: `${SITEMAP_BASE_URL}/agent/integration-kit`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/evals/resolve`, lastModified: now, changeFrequency: 'daily', priority: 0.88 },
    { url: `${SITEMAP_BASE_URL}/agent-skills-directory`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/agent-skills-registry`, lastModified: now, changeFrequency: 'weekly', priority: 0.92 },
    { url: `${SITEMAP_BASE_URL}/best`, lastModified: now, changeFrequency: 'daily', priority: 0.92 },
    { url: `${SITEMAP_BASE_URL}/trending`, lastModified: now, changeFrequency: 'hourly', priority: 0.92 },
    { url: `${SITEMAP_BASE_URL}/hot`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/audits`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/official`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/use-cases`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/tasks`, lastModified: now, changeFrequency: 'daily', priority: 0.91 },
    { url: `${SITEMAP_BASE_URL}/rankings`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/outcomes`, lastModified: now, changeFrequency: 'daily', priority: 0.89 },
    { url: `${SITEMAP_BASE_URL}/reports/weekly`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITEMAP_BASE_URL}/reports/monthly`, lastModified: now, changeFrequency: 'weekly', priority: 0.86 },
    { url: `${SITEMAP_BASE_URL}/reports/state-of-agent-skills-2026`, lastModified: now, changeFrequency: 'daily', priority: 0.92 },
    { url: `${SITEMAP_BASE_URL}/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/skill-packs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/compare`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITEMAP_BASE_URL}/compare/openagentskill-vs-skills-sh`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${SITEMAP_BASE_URL}/compare/openagentskill-vs-agentskills-io`, lastModified: now, changeFrequency: 'monthly', priority: 0.84 },
    { url: `${SITEMAP_BASE_URL}/alternatives/skills-sh`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${SITEMAP_BASE_URL}/alternatives/agentskills-io`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${SITEMAP_BASE_URL}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITEMAP_BASE_URL}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITEMAP_BASE_URL}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITEMAP_BASE_URL}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITEMAP_BASE_URL}/cli`, lastModified: now, changeFrequency: 'weekly', priority: 0.86 },
    { url: `${SITEMAP_BASE_URL}/creator-kit`, lastModified: now, changeFrequency: 'weekly', priority: 0.82 },
    { url: `${SITEMAP_BASE_URL}/x-kit`, lastModified: now, changeFrequency: 'daily', priority: 0.74 },
    { url: `${SITEMAP_BASE_URL}/activity`, lastModified: now, changeFrequency: 'hourly', priority: 0.6 },
  ]

  const localizedPages: SitemapEntry[] = Object.entries(LOCALIZED_LANDING_PAGES).map(([locale]) => ({
    url: `${SITEMAP_BASE_URL}/${locale}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.88,
    alternates: {
      languages: getLocalizedLanguageAlternates(SITEMAP_BASE_URL),
    },
  }))

  const localizedCorePages: SitemapEntry[] = MARKET_LOCALES.flatMap((locale) =>
    LOCALIZED_CORE_PAGE_SLUGS.map((page) => ({
      url: `${SITEMAP_BASE_URL}${getLocalizedCorePath(locale, page)}`,
      lastModified: now,
      changeFrequency: page === 'skills' || page === 'resolve' ? 'daily' as const : 'weekly' as const,
      priority: page === 'resolve' || page === 'skills' ? 0.86 : 0.8,
      alternates: {
        languages: getLocalizedCoreLanguageAlternates(page, SITEMAP_BASE_URL),
      },
    }))
  )

  return [
    ...staticPages,
    ...localizedPages,
    ...localizedCorePages,
    ...SKILL_CLUSTERS.map((cluster) => ({
      url: `${SITEMAP_BASE_URL}${cluster.path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: cluster.slug === 'world-cup-football' ? 0.9 : 0.88,
    })),
    ...USE_CASES.map((useCase) => ({
      url: `${SITEMAP_BASE_URL}/use-cases/${useCase.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...AGENT_TASKS.map((task) => ({
      url: `${SITEMAP_BASE_URL}/tasks/${task.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.86,
    })),
    ...OFFICIAL_CREATORS.map((creator) => ({
      url: `${SITEMAP_BASE_URL}/official/${creator.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.84,
    })),
    ...AGENT_PROFILES.map((profile) => ({
      url: `${SITEMAP_BASE_URL}/agents/${profile.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.84,
    })),
    ...SKILL_STACKS.map((stack) => ({
      url: `${SITEMAP_BASE_URL}/collections/${stack.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...SKILL_PACKS.map((pack) => ({
      url: `${SITEMAP_BASE_URL}/skill-packs/${pack.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.86,
    })),
    ...USE_CASES.map((useCase) => ({
      url: `${SITEMAP_BASE_URL}/blog/use-cases/${useCase.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    {
      url: `${SITEMAP_BASE_URL}/blog/introducing-addyosmani-agent-skills`,
      lastModified: new Date('2026-06-17T00:00:00.000Z'),
      changeFrequency: 'monthly',
      priority: 0.82,
    },
  ]
}

export function getBestSitemapEntries(now = new Date()): SitemapEntry[] {
  return BEST_SKILL_PAGES.map((page) => ({
    url: `${SITEMAP_BASE_URL}/best/${page.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.88,
  }))
}

export function getRankingSitemapEntries(now = new Date()): SitemapEntry[] {
  return getRankingDefinitions().map((ranking) => ({
    url: `${SITEMAP_BASE_URL}/rankings/${ranking.slug}`,
    lastModified: now,
    changeFrequency: ranking.kind === 'new-this-week' ? 'daily' : 'weekly',
    priority: ranking.kind === 'use-case' ? 0.82 : 0.85,
  }))
}

export function getGuideSitemapEntries(now = new Date()): SitemapEntry[] {
  return GROWTH_GUIDES.map((guide) => ({
    url: `${SITEMAP_BASE_URL}/guides/${guide.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: guide.intent === 'compare' ? 0.86 : 0.88,
  }))
}

export async function getSkillSitemapEntries(section: SitemapSection, index = 0): Promise<SitemapEntry[]> {
  const minStars = section === 'alternatives' ? 500 : 0
  const skills = await getSitemapSkillRecords(index, minStars)

  return skills.map((skill) => {
    const lastModified = dateFrom(skill.github_last_pushed_at || skill.updated_at)
    const highSignal = Number(skill.github_stars || 0) >= 500

    if (section === 'skill-audits') {
      return {
        url: `${SITEMAP_BASE_URL}/skills/${skill.slug}/audit`,
        lastModified,
        changeFrequency: 'weekly',
        priority: highSignal ? 0.76 : 0.68,
      }
    }

    if (section === 'skill-evals') {
      return {
        url: `${SITEMAP_BASE_URL}/skills/${skill.slug}/evals`,
        lastModified,
        changeFrequency: 'weekly',
        priority: highSignal ? 0.78 : 0.7,
      }
    }

    if (section === 'alternatives') {
      return {
        url: `${SITEMAP_BASE_URL}/alternatives/${skill.slug}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.78,
      }
    }

    return {
      url: `${SITEMAP_BASE_URL}/skills/${skill.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: highSignal ? 0.82 : 0.76,
    }
  })
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDate(value: Date | string | undefined) {
  if (!value) return new Date().toISOString()
  const date = value instanceof Date ? value : new Date(value)
  return (Number.isFinite(date.getTime()) ? date : new Date()).toISOString()
}

export function renderSitemapIndex(entries: Array<{ loc: string; lastmod: Date | string }>) {
  const body = entries
    .map((entry) => {
      return [
        '  <sitemap>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <lastmod>${formatDate(entry.lastmod)}</lastmod>`,
        '  </sitemap>',
      ].join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`
}

export function renderUrlSet(entries: SitemapEntry[]) {
  const body = entries
    .map((entry) => {
      const alternates = entry.alternates?.languages
        ? Object.entries(entry.alternates.languages)
            .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}" />`)
            .join('\n')
        : ''

      return [
        '  <url>',
        `    <loc>${escapeXml(entry.url)}</loc>`,
        `    <lastmod>${formatDate(entry.lastModified)}</lastmod>`,
        entry.changeFrequency ? `    <changefreq>${entry.changeFrequency}</changefreq>` : '',
        typeof entry.priority === 'number' ? `    <priority>${entry.priority.toFixed(2)}</priority>` : '',
        alternates,
        '  </url>',
      ].filter(Boolean).join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`
}
