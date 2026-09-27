import { createHash } from 'node:crypto'

/** Process-local optimization, never an authority for publication or access.
 * All inputs are hashed (not just slug/updated_at). Short TTL bounds clock-based
 * freshness; bounded entries/serialized bytes prevent unbounded memory growth.
 * A miss always computes normally. No distributed cache writes or model calls.
 */
export function createBoundedContentMemo<T>(options: {
  version: string; maxEntries: number; maxBytes: number; ttlMs: number
  now?: () => number
}) {
  const entries = new Map<string, { value: T; expires: number; bytes: number }>()
  const now = options.now ?? Date.now
  let bytes = 0
  return (inputs: unknown, compute: () => T): T => {
    const encoded = JSON.stringify(inputs)
    // Very large documents are not useful hot-cache entries.
    if (encoded.length > 256_000) return compute()
    const key = createHash('sha256').update(options.version).update(encoded).digest('hex')
    const time = now()
    const cached = entries.get(key)
    if (cached && cached.expires > time) {
      entries.delete(key)
      entries.set(key, cached)
      return structuredClone(cached.value)
    }
    if (cached) { bytes -= cached.bytes; entries.delete(key) }
    const value = compute() // Errors never enter the cache.
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8')
    if (size > options.maxBytes || options.maxEntries < 1) return value
    while (entries.size >= options.maxEntries || bytes + size > options.maxBytes) {
      const oldest = entries.keys().next().value
      if (oldest === undefined) break
      bytes -= entries.get(oldest)!.bytes
      entries.delete(oldest)
    }
    entries.set(key, { value: structuredClone(value), expires: time + options.ttlMs, bytes: size })
    bytes += size
    return value
  }
}
