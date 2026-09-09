import type { RankingSnapshot, RankingSnapshotItem } from '@/lib/ranking-snapshots'

export const TRENDING_METHODOLOGY_VERSION = 'trending-v5-recent-activity-2026-09'
export const TRENDING_LIMIT = 40

export interface TrendingEvidence {
  window_start: string
  window_end: string // exclusive; seven completed UTC days, not lifetime activity
  total_events: number
  views: number
  install_copies: number
  compares: number
  saves: number
  outbound_clicks: number
  active_days: number
}

export type TrendingItem = RankingSnapshotItem & { activity: TrendingEvidence }
export type TrendingSnapshot = Omit<RankingSnapshot, 'items'> & { items: TrendingItem[] }

export function trendingWindow(now = new Date()) {
  const end = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z')
  return { start: new Date(end.getTime() - 7 * 86_400_000).toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

/** Reject legacy snapshots instead of presenting cumulative popularity as this week's trend. */
export function isTrendingSnapshot(value: RankingSnapshot | null): value is TrendingSnapshot {
  if (!value || value.methodology_version !== TRENDING_METHODOLOGY_VERSION || !Array.isArray(value.items) || !Number.isFinite(Date.parse(value.generated_at))) return false
  const window = trendingWindow(new Date(value.generated_at))
  const seen = new Set<string>()
  return value.item_count === value.items.length && value.items.every((item, index) => {
    const activity = (item as TrendingItem).activity
    if (!activity || seen.has(item.slug) || item.rank !== index + 1 || !/^[a-z0-9][a-z0-9-]*$/i.test(item.slug)) return false
    seen.add(item.slug)
    const counts = [activity.total_events, activity.views, activity.install_copies, activity.compares, activity.saves, activity.outbound_clicks, activity.active_days]
    return activity.window_start === window.start && activity.window_end === window.end &&
      counts.every(n => Number.isSafeInteger(n) && n >= 0) && activity.total_events > 0 &&
      activity.active_days > 0 && activity.active_days <= 7
  })
}

export function isTrendingStale(snapshot: TrendingSnapshot, now = new Date()) {
  return now.getTime() - Date.parse(snapshot.generated_at) > 36 * 60 * 60 * 1000
}

export function trendingJsonLd(items: TrendingItem[], title: string, description: string, generatedAt?: string) {
  const url = 'https://www.openagentskill.com/trending'
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': url, url, name: title, description,
        ...(generatedAt ? { dateModified: generatedAt } : {}), mainEntity: { '@id': `${url}#list` } },
      { '@type': 'ItemList', '@id': `${url}#list`, itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: items.length, itemListElement: items.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.name,
          url: `https://www.openagentskill.com/skills/${item.slug}`,
        })) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OpenAgentSkill', item: 'https://www.openagentskill.com' },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ] },
    ],
  }
}
