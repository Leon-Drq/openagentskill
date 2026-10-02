export interface SourceRequest {
  sourceUrl: string
  discoverySource: string
}

/** Share the existing budget between old repositories, claims and discovery. */
export function scheduleSourceSync(options: {
  requested: readonly SourceRequest[]
  claimed: readonly SourceRequest[]
  stale: readonly SourceRequest[]
  seeds: readonly SourceRequest[]
  limit: number
  now?: number
}): SourceRequest[] {
  const selected: SourceRequest[] = []
  const seen = new Set<string>()
  const add = (source: SourceRequest) => {
    const key = source.sourceUrl.trim().replace(/\/+$/, '').toLowerCase()
    if (!key || seen.has(key) || selected.length >= options.limit) return
    seen.add(key)
    selected.push(source)
  }
  options.requested.forEach(add)
  const offset = Math.floor((options.now ?? Date.now()) / (6 * 60 * 60 * 1000)) % Math.max(1, options.seeds.length)
  const seeds = [...options.seeds.slice(offset), ...options.seeds.slice(0, offset)]
  const queues = [options.claimed, options.stale, seeds]
  for (let index = 0; index < Math.max(...queues.map((queue) => queue.length)); index++) {
    for (const queue of queues) if (queue[index]) add(queue[index])
    if (selected.length >= options.limit) break
  }
  return selected
}
