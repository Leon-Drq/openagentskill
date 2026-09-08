// UI taxonomy only: preserve source metadata and existing URL parameters.
const aliases: Record<string, string> = {
  coding: 'coding-agents', 'coding-agent': 'coding-agents', development: 'coding-agents', 'developer-tools': 'coding-agents',
  design: 'design-creative', creative: 'design-creative',
  video: 'video-creation', 'video-generation': 'video-creation',
  'rag-knowledge': 'research',
  'presentation-generation': 'presentation', 'ppt': 'presentation',
  'finance-quant': 'finance', 'marketing-growth': 'marketing', 'growth-marketing': 'marketing',
  'web-automation': 'web-scraping', 'browser-automation': 'web-scraping',
  'legal-compliance': 'legal', 'data-analysis': 'data',
}

export function directoryCategories(value: string): string[] {
  // Some historic categories were stored as bracketed, comma-separated arrays.
  return [...new Set(value.replace(/[\[\]"']/g, '').split(',').map(part => {
    const key = part.trim().toLowerCase().replace(/[\s_]+/g, '-')
    return aliases[key] || key
  }).filter(Boolean))]
}

export function matchesDirectoryCategory(actual: string, selected: string) {
  const wanted = directoryCategories(selected)
  return selected === 'all' || directoryCategories(actual).some(key => wanted.includes(key))
}

export function directoryCategoryOptions(values: string[]) {
  return [...new Set(values.flatMap(directoryCategories))].sort((a, b) => a.localeCompare(b))
}

export function directoryHref(pathname: string, search: string, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams(search)
  for (const [key, value] of Object.entries(updates)) {
    if (value && value !== 'all') params.set(key, value)
    else params.delete(key)
  }
  if (!Object.prototype.hasOwnProperty.call(updates, 'page')) params.delete('page')
  return `${pathname}${params.size ? `?${params.toString()}` : ''}`
}

export function isDirectorySnapshot(record: { id: string; submission_source?: string | null }) {
  return /^(fallback|snapshot)-/.test(record.id) || record.submission_source === 'fallback'
}

export function sortDirectoryCandidates<T extends { record: { slug: string; github_stars?: number | null; downloads?: number | null; quality_score?: number | null; created_at: string; updated_at: string; github_last_pushed_at?: string | null } }>(items: T[], sort: string) {
  const timestamp = (value: string) => Date.parse(value) || 0
  return items.slice().sort((a, b) => {
    const l = a.record, r = b.record
    const delta = sort === 'stars' ? Number(r.github_stars || 0) - Number(l.github_stars || 0)
      : sort === 'new' ? timestamp(r.created_at) - timestamp(l.created_at)
      : sort === 'fresh' ? timestamp(r.github_last_pushed_at || r.updated_at) - timestamp(l.github_last_pushed_at || l.updated_at)
      : sort === 'trending' || sort === 'downloads' ? Number(r.downloads || 0) - Number(l.downloads || 0)
      : Number(r.quality_score || 0) - Number(l.quality_score || 0)
    return delta || Number(r.github_stars || 0) - Number(l.github_stars || 0) || l.slug.localeCompare(r.slug)
  })
}
