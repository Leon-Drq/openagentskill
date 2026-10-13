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

// Paid text offers use the existing directory. Runtime checkout availability is
// backed by an actual private release, independently of visual reproduction.
export function selectMotionDirectoryEntries(filters: MotionDirectoryFilters) {
  if (filters.access && !['all', 'paid'].includes(filters.access)) return []
  if (filters.pricing && !['all', 'paid'].includes(filters.pricing)) return []
  if ([filters.topic, filters.quality, filters.trust,
    filters.safety, filters.supplyTrack, filters.useCase].some(v => v && v !== 'all')) return []
  if (filters.featured || (filters.minStars || 0) > 0) return []
  if (filters.platform && filters.platform !== 'all' && !['codex', 'claude code', 'cursor'].includes(filters.platform.toLowerCase())) return []
  if (filters.output && filters.output !== 'all' && !['animation', 'video'].includes(filters.output)) return []
  return filterMotionEntries(filters.query)
}

/** Keep paid catalog pagination correct when completed registry offers coexist. */
export function paidMotionWindow<T, U>(motion: T[], registry: U[], offset: number, size = 16, counts?: { motion: (entry: T) => number; registry: (entry: U) => number }) {
  if (counts) {
    const ranked = [...motion.map(entry => ({ kind: 'motion' as const, entry, count: counts.motion(entry) })),
      ...registry.map(entry => ({ kind: 'registry' as const, entry, count: counts.registry(entry) }))]
      .sort((a, b) => b.count - a.count).slice(offset, offset + size)
    return { motionEntries: ranked.flatMap(row => row.kind === 'motion' ? [row.entry] : []),
      registryEntries: ranked.flatMap(row => row.kind === 'registry' ? [row.entry] : []), total: motion.length + registry.length }
  }
  const entries = motion.slice(offset, offset + size)
  const registryOffset = Math.max(0, offset - motion.length)
  return { motionEntries: entries, registryEntries: registry.slice(registryOffset, registryOffset + size - entries.length), total: motion.length + registry.length }
}
