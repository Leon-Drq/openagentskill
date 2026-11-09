import { createHash } from 'node:crypto'

// Cache only anonymous HTML directory reads. Flight, actions, accounts and
// preview requests always reach Next; their protocol/personalization is intact.
export const DIRECTORY_EDGE_TTL = 4 * 60 * 60
export const DIRECTORY_READY_MARKER = '<template data-oas-directory-cache="ready"></template>'
const MAX_BODY_BYTES = 1_500_000
const queryKeys = new Set(['q', 'sort', 'category', 'access', 'pricing', 'tag', 'output',
  'useCase', 'platform', 'quality', 'trust', 'safety', 'track', 'minStars', 'page',
  'lang', 'featured', 'examples', 'view'])
const pending = new Map()
const hash = value => createHash('sha256').update(value).digest('hex')
const varyHeaders = ['accept', 'accept-language', 'user-agent']

export function directoryCacheRequest(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return null
  const url = new URL(request.url)
  if (!/^\/(?:zh\/|ja\/|ko\/|es\/|de\/|fr\/|id\/)?skills$/.test(url.pathname)) return null
  if (url.search.length > 1500 || !url.search) return null
  for (const [key, value] of url.searchParams) {
    if (!queryKeys.has(key) || url.searchParams.getAll(key).length !== 1 || value.length > 180) return null
  }
  if (url.searchParams.has('page') && !/^(?:[1-9]|[12][0-9]|30)$/.test(url.searchParams.get('page'))) return null
  // A locale preference may redirect before rendering. Leave that to proxy.
  if (url.searchParams.has('lang')) return null
  for (const key of request.headers.keys()) {
    if (['cookie', 'authorization', 'range', 'rsc', 'purpose', 'sec-purpose'].includes(key)
      || key.startsWith('next-') || key.startsWith('x-next') || key.startsWith('x-middleware')
      || key.startsWith('x-prerender') || key.startsWith('if-')) return null
  }
  if (/no-cache|no-store|max-age\s*=\s*0/i.test(request.headers.get('cache-control') || '')
    || request.headers.has('pragma')) return null
  url.searchParams.sort()
  // Do not let unkeyed forwarding/custom headers change a cached render.
  const headers = new Headers()
  for (const key of varyHeaders) if (request.headers.has(key)) headers.set(key, request.headers.get(key))
  // OpenNext uses Host to distinguish local middleware rewrites from external
  // requests. A bare Request(URL) does not supply it: a category rewrite can
  // otherwise re-enter the public-only guard and return 404. Derive it from
  // the keyed URL, never an untrusted Host/forwarding override.
  headers.set('host', url.host)
  return { url, headers, identity: JSON.stringify([url.href, ...varyHeaders.map(key => headers.get(key))]) }
}

function tagNames(pathname, buildId) {
  const segments = pathname.split('/').filter(Boolean)
  const tags = new Set(['public-skill-directory', 'public-skill-stats', 'public-skill-outcomes',
    'public-skill-events', 'public-skill-audits', '_N_T_/layout', '_N_T_/skills', '_N_T_/skills/page'])
  for (let i = 1; i <= segments.length; i++) {
    const path = '/' + segments.slice(0, i).join('/')
    tags.add(`_N_T_${path}`); tags.add(`_N_T_${path}/layout`); tags.add(`_N_T_${path}/page`)
  }
  return [...tags].sort().map(tag => `${buildId}/${tag}`)
}

async function revision(db, tags) {
  // Read authoritative invalidations on every hit. Never reuse an edge entry
  // when D1 is unavailable or a publication/path/tag invalidation has changed.
  const session = db.withSession ? db.withSession('first-primary') : db
  const result = await session.prepare(`SELECT tag,revalidatedAt,stale,expire FROM revalidations WHERE tag IN (${tags.map(() => '?').join(',')})`).bind(...tags).all()
  if (result.success === false || !Array.isArray(result.results)) throw new Error('Tag revision unavailable')
  return hash(JSON.stringify(result.results.map(row => [row.tag, row.revalidatedAt, row.stale, row.expire])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))))
}

async function boundedBody(response) {
  if (Number(response.headers.get('content-length')) > MAX_BODY_BYTES) return null
  const reader = response.clone().body?.getReader()
  if (!reader) return null
  const chunks = []; let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_BODY_BYTES) { void reader.cancel().catch(() => {}); return null }
      chunks.push(value)
    }
  } catch { return null } finally { reader.releaseLock() }
  const body = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

function outward(response, method, state) {
  const headers = new Headers(response.headers)
  // Cache API owns the shared copy. Browsers/downstream CDNs must not retain
  // copies that skip the authoritative tag check after an owner edit.
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-OAS-Directory-Cache', state)
  headers.delete('x-oas-stored-at')
  if (method === 'HEAD') void response.body?.cancel().catch(() => {})
  return new Response(method === 'HEAD' ? null : response.body, { status: response.status, headers })
}

export async function publicDirectoryResponse(request, env, ctx, buildId, render, suppliedCache) {
  const candidate = env.PUBLIC_DIRECTORY_EDGE_CACHE === '1'
    && env.STAGING_PRIVATE !== '1' && env.MIGRATION_READ_ONLY !== '1'
    && env.SUPABASE_DATA_PAUSED !== '1' && directoryCacheRequest(request)
  if (!candidate || !env.NEXT_TAG_CACHE_D1 || !/^[\w-]+$/.test(buildId || '')) return render(request)
  let cache, version
  const tags = tagNames(candidate.url.pathname, buildId)
  try {
    cache = suppliedCache || await caches.open('oas-public-directory-v1')
    version = await revision(env.NEXT_TAG_CACHE_D1, tags)
  } catch { return render(request) }
  const key = new Request(`${candidate.url.origin}/__oas-directory-cache/${buildId}/${hash(candidate.identity + version)}`)
  try {
    const hit = await cache.match(key)
    if (hit) {
      const stored = Number(hit.headers.get('x-oas-stored-at'))
      if (stored > 0 && Date.now() >= stored && Date.now() - stored < DIRECTORY_EDGE_TTL * 1000) return outward(hit, request.method, 'HIT')
      void hit.body?.cancel().catch(() => {})
    }
  } catch { return render(request) }
  // HEAD never populates a truncated GET representation.
  if (request.method === 'HEAD') return render(request)
  if (pending.has(key.url)) {
    try {
      const shared = await pending.get(key.url)
      if (shared.reusable) return outward(shared.response.clone(), 'GET', 'COALESCED')
    } catch { /* The first caller may have disconnected. Render independently. */ }
    return render(request)
  }
  const load = async () => {
    const response = await render(new Request(candidate.url, { headers: candidate.headers, signal: request.signal }))
    const vary = (response.headers.get('vary') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
    if (response.status !== 200 || response.headers.has('set-cookie')
      || !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '')
      || vary.some(key => ![...varyHeaders, 'accept-encoding', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-url'].includes(key))) return { response, reusable: false }
    const body = await boundedBody(response)
    if (!body) return { response, reusable: false }
    const text = new TextDecoder().decode(body)
    // Only the successful directory renderer emits this literal HTML marker.
    // Errors, archived/degraded data and partial streamed failures stay uncached.
    if (!text.includes(DIRECTORY_READY_MARKER) || !text.endsWith('</html>')
      || /NEXT_HTTP_ERROR_FALLBACK|NEXT_REDIRECT|\b[\da-f]+:E\{/.test(text)) return { response, reusable: false }
    let unchanged = false
    try { unchanged = version === await revision(env.NEXT_TAG_CACHE_D1, tags) } catch { /* fail shut */ }
    const result = new Response(body, response)
    void response.body?.cancel().catch(() => {})
    if (unchanged) {
      const stored = new Response(body, response)
      stored.headers.set('Cache-Control', `public, max-age=${DIRECTORY_EDGE_TTL}`)
      stored.headers.set('x-oas-stored-at', String(Date.now()))
      // Cache API does not implement Vary matching. All supported varying
      // request inputs are explicitly keyed; unsupported variations bypass.
      stored.headers.delete('vary')
      ctx.waitUntil(cache.put(key, stored).catch(() => {}))
    }
    return { response: result, reusable: unchanged }
  }
  const promise = load()
  // Bound only concurrent coalescing; cache capacity/eviction belongs to the
  // edge cache. There is no unbounded isolate map or new R2 write per page.
  const tracked = pending.size < 8
  if (tracked) pending.set(key.url, promise)
  try { return outward((await promise).response.clone(), 'GET', 'MISS') }
  finally { if (tracked && pending.get(key.url) === promise) pending.delete(key.url) }
}
