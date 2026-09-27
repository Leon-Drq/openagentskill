import { createHash } from 'node:crypto'

/** Bounded process-local memo for pure, expensive derived values. Full input
 * content is fingerprinted so changed safety evidence cannot reuse old output.
 * This is an optimization only; cold instances compute the identical result. */
export function createContentMemo<Input, Output>(
  compute: (input: Input) => Output,
  { maxEntries = 512, ttlMs = 60_000, maxInputChars = 256_000, now = Date.now } = {},
) {
  const entries = new Map<string, { expires: number; value: Output }>()
  return (input: Input): Output => {
    const serialized = JSON.stringify(input)
    if (!serialized || serialized.length > maxInputChars) return compute(input)
    const key = createHash('sha256').update(serialized).digest('hex')
    const time = now()
    const entry = entries.get(key)
    if (entry && entry.expires > time) {
      entries.delete(key)
      entries.set(key, entry)
      return entry.value
    }
    entries.delete(key)
    // Errors are never cached. Profiles can depend on time (freshness), so even
    // unchanged records expire, without extending their lifetime on a hit.
    const value = compute(input)
    if (maxEntries > 0) {
      entries.set(key, { expires: time + ttlMs, value })
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value!)
    }
    return value
  }
}
