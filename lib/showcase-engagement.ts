import type { ShowcaseCase } from './showcase'

export type ShowcaseVote = 1 | -1 | null
export type ShowcaseStats = Record<string, { likes: number; dislikes: number; vote: ShowcaseVote }>
export type ShowcaseSort = 'curated' | 'top'

// Stable ties preserve the editorial order, including when every case has zero likes.
export function sortShowcaseCases(cases: ShowcaseCase[], sort: ShowcaseSort, stats: ShowcaseStats) {
  const score = (slug: string) => (stats[slug]?.likes ?? 0) - (stats[slug]?.dislikes ?? 0)
  return sort === 'top'
    ? [...cases].sort((a, b) => score(b.slug) - score(a.slug))
    : cases
}

export function getShowcaseShareUrl(slug: string, locale: string) {
  const url = new URL(`/showcase/${encodeURIComponent(slug)}`, 'https://www.openagentskill.com')
  if (locale !== 'en') url.searchParams.set('lang', locale)
  url.searchParams.set('utm_source', 'gallery')
  url.searchParams.set('utm_medium', 'share')
  url.searchParams.set('utm_campaign', 'skill_gallery')
  return url.toString()
}
