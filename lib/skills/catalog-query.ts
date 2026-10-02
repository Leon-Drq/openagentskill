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

// Saved selections cannot implement database filters or later registry pages.
export function canShowCatalogSnapshot(page: number, category: string, minStars: number, pricing: string) {
  return page === 1 && category === 'all' && minStars === 0 && pricing === 'all'
}

// Case membership is available locally; intersect it before limiting the saved
// selection. This remains a snapshot, never a live total or registry page.
export function selectCatalogSnapshot<T extends { slug: string }>(records: readonly T[], exampleSlugs: readonly string[] | null) {
  return records.filter(record => exampleSlugs === null || exampleSlugs.includes(record.slug)).slice(0, CATALOG_PAGE_SIZE)
}

// Explicit new filters take precedence over bookmarked legacy view URLs.
export function directoryDiscoveryFilters(params: { featured?: string; examples?: string; view?: string }) {
  return {
    featured: params.featured === undefined ? params.view === 'skills' : params.featured === 'true',
    examplesOnly: params.examples === 'true',
  }
}
