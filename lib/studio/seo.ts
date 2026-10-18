import type { Metadata } from 'next'
import { locales, type Locale } from '@/lib/i18n/config'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { membershipCopy } from '@/lib/i18n/membership-copy'
import { STUDIO_SKILL, studioHref } from './catalog'

const site = 'https://www.openagentskill.com'
export function studioSitemapEntries() {
  return ['/membership', STUDIO_SKILL.path].flatMap(path => locales.map(locale => ({
    url: `${site}${studioHref(path, locale)}`,
    lastModified: path === '/membership' ? '2026-10-18' : STUDIO_SKILL.publishedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    alternates: { languages: { ...Object.fromEntries(locales.map(language => [language, `${site}${studioHref(path, language)}`])), 'x-default': `${site}${path}` } },
  })))
}
export function studioMetadata(locale: Locale, kind: 'membership' | 'skill'): Metadata {
  const c = studioCopy(locale)
  const path = kind === 'membership' ? '/membership' : STUDIO_SKILL.path
  const title = kind === 'membership' ? `${c.membership} · OpenAgentSkill Pro` : `${STUDIO_SKILL.name} · ${c.studio}`
  const description = kind === 'membership' ? membershipCopy(locale).description : c.skillLead
  const url = site + studioHref(path, locale)
  return {
    title, description, alternates: { canonical: url, languages: { ...Object.fromEntries(locales.map(l => [l, site + studioHref(path, l)])), 'x-default': site + path } },
    openGraph: { title, description, url, type: 'website', siteName: 'OpenAgentSkill', images: [{ url: `${site}/opengraph-image?v=3`, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${site}/opengraph-image?v=3`] },
  }
}
export function studioPageData(locale: Locale, kind: 'membership' | 'skill') {
  const c = studioCopy(locale)
  const path = kind === 'membership' ? '/membership' : STUDIO_SKILL.path
  return {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: kind === 'membership' ? c.membership : STUDIO_SKILL.name,
    description: kind === 'membership' ? membershipCopy(locale).description : c.skillLead,
    url: site + studioHref(path, locale), inLanguage: locale,
    // A planned price is not an Offer. No invented sales, reviews or ratings.
    isPartOf: { '@type': 'WebSite', name: 'OpenAgentSkill', url: site },
  }
}
