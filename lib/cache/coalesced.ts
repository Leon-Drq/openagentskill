/** Bounded warm-instance cache. Failures and degraded values never become hits. */
export function createCoalescedCache<T>(options: {
  ttlMs: number; maxEntries: number; cacheWhen: (value: T) => boolean
}) {
  const entries = new Map<string, { expiresAt: number; pending?: Promise<T>; value?: T }>()
  return (key: string, read: () => Promise<T>): Promise<T> => {
    const cached = entries.get(key)
    if (cached?.pending) return cached.pending
    if (cached && cached.expiresAt > Date.now() && cached.value !== undefined) return Promise.resolve(cached.value)
    if (!entries.has(key) && entries.size >= options.maxEntries) entries.delete(entries.keys().next().value!)
    const entry: { expiresAt: number; pending?: Promise<T>; value?: T } = { expiresAt: 0 }
    entries.set(key, entry)
    entry.pending = Promise.resolve().then(read).then(value => {
      if (entries.get(key) === entry) {
        if (options.cacheWhen(value)) {
          entry.value = value
          entry.expiresAt = Date.now() + options.ttlMs
          entry.pending = undefined
        } else entries.delete(key)
      }
      return value
    }, error => {
      if (entries.get(key) === entry) entries.delete(key)
      throw error
    })
    return entry.pending
  }
}
