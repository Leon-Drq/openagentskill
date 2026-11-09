import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'

export function isIncompleteHome(value: unknown) {
  if (!value || typeof value !== 'object' || !('html' in value) || typeof value.html !== 'string') return false
  return value.html.includes('data-oas-home-cache="fallback"')
}

// Credential-free builds can render the home shell but cannot read production
// D1. Never promote that fallback HTML/RSC to a fresh four-hour ISR entry.
// Keep OpenNext's interceptor, tags, queue and R2 key format unchanged.
type Cache = Pick<typeof r2IncrementalCache, 'name' | 'get' | 'set' | 'delete'>
export function withHomeCacheGuard(base: Cache): Cache {
  return {
    name: base.name,
    async get(key, type) {
      const entry = await base.get(key, type)
      return isIncompleteHome(entry?.value) ? null : entry
    },
    async set(key, value, type) {
      // A failed refresh must not replace the last successful homepage either.
      if (!isIncompleteHome(value)) await base.set(key, value, type)
    },
    delete: (key) => base.delete(key),
  }
}

export default withHomeCacheGuard(r2IncrementalCache)
