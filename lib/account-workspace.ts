import type { Locale } from './i18n/config'

export const accountTabs = ['overview', 'bookmarks', 'points', 'settings'] as const
export type AccountTab = typeof accountTabs[number]
export const accountTab = (value: unknown): AccountTab => accountTabs.find(tab => tab === value) || 'overview'
export function accountHref(tab: AccountTab, locale: Locale, after?: string | null) {
  const query = new URLSearchParams({ tab, lang: locale })
  if (after) query.set('after', after)
  return `/profile?${query}`
}
export function safeAccountNext(value: string | null | undefined, fallback = '/profile') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://www.openagentskill.com')
    return url.origin === 'https://www.openagentskill.com' ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch { return fallback }
}
export const savedCursor = (value: unknown) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,199}$/.test(value) ? value : null
export interface SavedSkill {
  slug: string
  name: string
  description: string
  category: string | null
  source: string
  available: boolean
}
// Both stores are ordered by their unique slug. A bounded merge gives stable
// keyset pagination without loading a user's entire collection into memory.
export function mergeSavedSlugs(groups: { skill_slug: string }[][], limit: number) {
  const slugs = [...new Set(groups.flat().map(row => row.skill_slug))].sort()
  return { slugs: slugs.slice(0, limit), next: slugs.length > limit ? slugs[limit - 1] : null }
}
export function publicAccountUrl(username: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(username)) return null
  return `https://www.openagentskill.com/creators/${username}`
}
export function accountXIntent(username: string, text: string) {
  const url = publicAccountUrl(username)
  if (!url) return null
  return `https://x.com/intent/tweet?${new URLSearchParams({ text: text.slice(0, 220), url })}`
}
