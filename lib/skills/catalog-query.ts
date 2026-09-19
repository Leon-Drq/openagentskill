export const CATALOG_PAGE_SIZE = 16

export function catalogPageNumber(value: string | undefined) {
  const number = Number(value || 1)
  return Number.isFinite(number) ? Math.max(1, Math.min(100_000, Math.floor(number))) : 1
}

export function catalogSortColumn(sort: string) {
  if (sort === 'new') return 'created_at'
  if (sort === 'fresh') return 'github_last_pushed_at'
  if (sort === 'trending' || sort === 'downloads') return 'downloads'
  if (sort === 'quality') return 'quality_score'
  return 'github_stars'
}

export function catalogStars(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(10_000_000, Math.floor(value))) : 0
}
