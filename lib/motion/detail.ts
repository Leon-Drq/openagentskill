import type { Metadata } from 'next'
import { MOTION_ENTRIES, MOTION_PUBLISHED_AT } from './catalog'
import { motionDetailCopy } from './detail-copy'
import { motionSkillHref } from './routes'
import type { MotionEntry, MotionLocale } from './shared'

const site = 'https://www.openagentskill.com'
export function motionDetailDescription(entry: MotionEntry, locale: MotionLocale) {
  return motionDetailCopy(locale).aboutBody.replace('{title}', entry.title)
}
export function motionDetailMetadata(entry: MotionEntry, locale: MotionLocale): Metadata {
  const title = `${entry.title} · Motion Skill`
  const description = motionDetailDescription(entry, locale)
  const url = site + motionSkillHref(entry.id, locale)
  const images = [{ url: entry.posterUrl, width: entry.width, height: entry.height, alt: entry.title }]
  return {
    title, description,
    alternates: { canonical: url, languages: { en: site + motionSkillHref(entry.id), 'zh-CN': site + motionSkillHref(entry.id, 'zh'), 'x-default': site + motionSkillHref(entry.id) } },
    openGraph: { title, description, url, type: 'website', siteName: 'OpenAgentSkill', locale: locale === 'zh' ? 'zh_CN' : 'en_US', images },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}
export function motionSitemapEntries() {
  return MOTION_ENTRIES.flatMap(entry => (['en', 'zh'] as const).map(locale => ({
    url: site + motionSkillHref(entry.id, locale), lastModified: MOTION_PUBLISHED_AT,
    changeFrequency: 'monthly' as const, priority: 0.6,
    alternates: { languages: { en: site + motionSkillHref(entry.id), 'zh-CN': site + motionSkillHref(entry.id, 'zh'), 'x-default': site + motionSkillHref(entry.id) } },
  })))
}
export function relatedMotionEntries(entry: MotionEntry, limit = 3) {
  return MOTION_ENTRIES.filter(candidate => candidate.id !== entry.id)
    .sort((a, b) => b.tags.filter(tag => entry.tags.includes(tag)).length - a.tags.filter(tag => entry.tags.includes(tag)).length || a.number - b.number)
    .slice(0, limit)
}
