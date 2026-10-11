import { filterMotionEntries } from './catalog'

export interface MotionDirectoryFilters {
  query?: string
  access?: string
  pricing?: string
  topic?: string
  output?: string
  featured?: boolean
  platform?: string
  minStars?: number
  quality?: string
  trust?: string
  safety?: string
  supplyTrack?: string
  useCase?: string
}

// These are owner-authored preview packages. Do not manufacture paid/free
// inventory, stars, review scores or registry installation telemetry for them.
export function selectMotionDirectoryEntries(filters: MotionDirectoryFilters) {
  if ([filters.access, filters.pricing, filters.topic, filters.quality, filters.trust,
    filters.safety, filters.supplyTrack, filters.useCase].some(v => v && v !== 'all')) return []
  if (filters.featured || (filters.minStars || 0) > 0) return []
  if (filters.platform && filters.platform !== 'all' && !['codex', 'claude code', 'cursor'].includes(filters.platform.toLowerCase())) return []
  if (filters.output && filters.output !== 'all' && !['animation', 'svg', 'html'].includes(filters.output)) return []
  return filterMotionEntries(filters.query)
}
