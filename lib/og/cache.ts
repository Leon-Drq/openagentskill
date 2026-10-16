/** Portable PNG cache: no Next, database, filesystem or Node-only imports. */
export const OG_TTL_SECONDS = 7200
export const OG_STALE_SECONDS = 86400
export const OG_MAX_BYTES = 2 * 1024 * 1024
export const OG_RENDER_VERSION = 'v1'

export type OgImage = { body: Uint8Array; contentType: string; generatedAt: number }
export interface OgStorage {
  get(key: string, signal: AbortSignal): Promise<OgImage | null>
  put(key: string, image: OgImage, signal: AbortSignal): Promise<void>
}

export function ogError(status = 404) {
  return new Response(status === 404 ? 'Not Found' : 'Temporarily unavailable', {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', ...(status === 503 ? { 'Retry-After': '60' } : {}) },
  })
}

export function validOgIdentifier(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,199}$/.test(value)
}

/** Hash all content inputs, never arbitrary query strings or path fragments. */
export async function ogCacheKey(kind: string, inputs: readonly unknown[]) {
  const bytes = new TextEncoder().encode(JSON.stringify([OG_RENDER_VERSION, kind, ...inputs]))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return `og/${OG_RENDER_VERSION}/${kind}/${hash}.png`
}

export function isOgPng(image: Pick<OgImage, 'body' | 'contentType'>) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  return image.contentType.split(';')[0].trim() === 'image/png'
    && image.body.byteLength > 24 && image.body.byteLength <= OG_MAX_BYTES
    && signature.every((byte, i) => image.body[i] === byte)
}

export async function readOgBytes(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > OG_MAX_BYTES) throw new Error('OG image exceeds cache limit')
      parts.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const body = new Uint8Array(length)
  let offset = 0
  for (const part of parts) { body.set(part, offset); offset += part.byteLength }
  return body
}

type Result = { image?: OgImage; response?: Response; source: 'render' | 'storage' }
type CacheEvent = { event: 'render' | 'storage-error' | 'render-error'; key: string; durationMs?: number }

export function createOgCache(options: {
  storage?: OgStorage
  now?: () => number
  maxEntries?: number
  maxBytes?: number
  maxPending?: number
  storageTimeoutMs?: number
  onEvent?: (event: CacheEvent) => void
} = {}) {
  const now = options.now || Date.now
  const entries = new Map<string, OgImage>()
  const pending = new Map<string, Promise<Result>>()
  let totalBytes = 0
  let storageRetryAt = 0
  const fresh = (image: OgImage) => Number.isFinite(image.generatedAt)
    && image.generatedAt <= now() && now() - image.generatedAt < OG_TTL_SECONDS * 1000
  const remove = (key: string) => {
    const value = entries.get(key)
    if (value) totalBytes -= value.body.byteLength
    entries.delete(key)
  }
  const remember = (key: string, image: OgImage) => {
    const maxBytes = options.maxBytes ?? 16 * 1024 * 1024
    if (image.body.byteLength > maxBytes) return
    remove(key)
    while (entries.size && (entries.size >= (options.maxEntries ?? 64) || totalBytes + image.body.byteLength > maxBytes)) {
      remove(entries.keys().next().value!)
    }
    entries.set(key, image)
    totalBytes += image.body.byteLength
  }
  const respond = (image: OgImage, source: string) => {
    // A storage/memory hit must not start another full two-hour freshness window.
    const remaining = Math.max(0, Math.floor((image.generatedAt + OG_TTL_SECONDS * 1000 - now()) / 1000))
    return new Response(image.body.slice().buffer, { headers: {
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=0, s-maxage=${remaining}, stale-while-revalidate=${OG_STALE_SECONDS}`,
      'X-OG-Cache': source,
      'X-Content-Type-Options': 'nosniff',
    } })
  }
  const storageCall = async <T>(key: string, call: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([call(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('OG storage timeout')) }, options.storageTimeoutMs ?? 1500)
      })])
    } catch {
      // No raw SDK errors: some include request URLs or credential context.
      storageRetryAt = now() + 60_000
      options.onEvent?.({ event: 'storage-error', key })
      return null
    } finally { clearTimeout(timer) }
  }

  return async (key: string, render: () => Promise<Response> | Response, persist = true): Promise<Response> => {
    const cached = entries.get(key)
    if (cached && fresh(cached)) {
      entries.delete(key); entries.set(key, cached)
      return respond(cached, 'memory')
    }
    remove(key)
    let task = pending.get(key)
    if (!task) {
      // Never evict an in-flight render and start duplicate work for its key.
      if (pending.size >= (options.maxPending ?? 16)) return ogError(503)
      task = (async (): Promise<Result> => {
        if (persist && options.storage && now() >= storageRetryAt) {
          const saved = await storageCall(key, signal => options.storage!.get(key, signal))
          if (saved && isOgPng(saved) && fresh(saved)) {
            remember(key, saved)
            return { image: saved, source: 'storage' }
          }
        }
        const started = now()
        try {
          const response = await render()
          if (response.status !== 200) {
            response.headers.set('Cache-Control', 'no-store, max-age=0')
            return { response, source: 'render' }
          }
          if (!response.body) throw new Error('Empty OG response')
          const image: OgImage = { body: await readOgBytes(response.body), contentType: response.headers.get('content-type') || '', generatedAt: now() }
          if (!isOgPng(image)) throw new Error('Invalid OG image')
          options.onEvent?.({ event: 'render', key, durationMs: now() - started })
          if (persist && options.storage && now() >= storageRetryAt) {
            // Await bounded writes so a finished invocation cannot drop the upload.
            await storageCall(key, signal => options.storage!.put(key, image, signal))
          }
          remember(key, image)
          return { image, source: 'render' }
        } catch {
          options.onEvent?.({ event: 'render-error', key })
          return { response: ogError(503), source: 'render' }
        }
      })()
      pending.set(key, task)
      void task.finally(() => pending.delete(key))
    }
    const result = await task
    // Each caller gets its own body, including concurrent error responses.
    return result.image ? respond(result.image, result.source) : result.response!.clone()
  }
}
