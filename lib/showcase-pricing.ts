// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { getSkillCommerce, type AcquisitionType } from './skills/commerce.ts'

export type ShowcasePriceFilter = 'all' | 'free' | 'paid'
export function normalizeShowcasePrice(value: string | null | undefined): ShowcasePriceFilter {
  return value === 'free' || value === 'paid' ? value : 'all'
}

// Paid includes optional paid editions. Unknown is not a visible category and
// never becomes free merely because a repository is public or open source.
export function showcasePriceCategory(type: AcquisitionType): Exclude<ShowcasePriceFilter, 'all'> | null {
  return type === 'free' ? 'free' : type === 'paid' || type === 'freemium' ? 'paid' : null
}
export function getShowcasePrice(slug: string, now = Date.now()) {
  return showcasePriceCategory(getSkillCommerce(slug, now).type)
}
export function matchesShowcasePrice(slug: string, filter: ShowcasePriceFilter) {
  return filter === 'all' || getShowcasePrice(slug) === filter
}
