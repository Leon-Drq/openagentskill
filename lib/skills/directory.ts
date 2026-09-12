import { getSkillSourceEvidence } from './source-evidence'
import type { SkillRecord } from '@/lib/db/skills'

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
    if (value && (value !== 'all' || key === 'view')) params.set(key, value)
    else params.delete(key)
  }
  if (!Object.prototype.hasOwnProperty.call(updates, 'page')) params.delete('page')
  return `${pathname}${params.size ? `?${params.toString()}` : ''}`
}

export function isDirectorySnapshot(record: { id: string; submission_source?: string | null }) {
  return /^(fallback|snapshot)-/.test(record.id) || record.submission_source === 'fallback'
}

export function sortDirectoryCandidates<T extends { record: { slug: string; github_repo?: string | null; source_path?: string | null; source_sync_status?: SkillRecord['source_sync_status']; github_stars?: number | null; downloads?: number | null; quality_score?: number | null; created_at: string; updated_at: string; github_last_pushed_at?: string | null } }>(items: T[], sort: string) {
  const timestamp = (value: string) => Date.parse(value) || 0
  const sorted = items.slice().sort((a, b) => {
    const l = a.record, r = b.record
    const delta = sort === 'stars' ? Number(r.github_stars || 0) - Number(l.github_stars || 0)
      : sort === 'new' ? timestamp(r.created_at) - timestamp(l.created_at)
      : sort === 'fresh' ? timestamp(r.github_last_pushed_at || r.updated_at) - timestamp(l.github_last_pushed_at || l.updated_at)
      : sort === 'trending' || sort === 'downloads' ? Number(r.downloads || 0) - Number(l.downloads || 0)
      : Number(r.quality_score || 0) - Number(l.quality_score || 0)
    return delta || Number(r.github_stars || 0) - Number(l.github_stars || 0) || l.slug.localeCompare(r.slug)
  })
  if (sort !== 'quality') return sorted
  // Recommendation is discovery, not a safety verdict. Keep explicit stars,
  // dates and query relevance untouched. Within each evidence group, show one
  // entry per repository per round instead of letting a monorepo fill page 1.
  const groups = [true, false].map(recorded => sorted.filter(item =>
    (getSkillSourceEvidence({ ...item.record, github_repo: item.record.github_repo || undefined }).status === 'source-recorded') === recorded))
  return groups.flatMap(group => {
    const seen = new Map<string, number>()
    return group.map((item, position) => {
      const key = item.record.github_repo?.toLowerCase() || `slug:${item.record.slug}`
      const round = seen.get(key) || 0
      seen.set(key, round + 1)
      return { item, round, position }
    }).sort((a, b) => a.round - b.round || a.position - b.position).map(entry => entry.item)
  })
}

/** Safe stored-category variants for a server-side shortlist query. */
export function directoryCategoryTerms(selected: string) {
  const canonical = directoryCategories(selected)
  return [...new Set([...canonical, ...Object.keys(aliases).filter(key => canonical.includes(aliases[key]))])]
    .filter(term => /^[a-z0-9-]{1,64}$/.test(term))
    .flatMap(term => [...new Set([term, term.replaceAll('-', ' ')])])
}
