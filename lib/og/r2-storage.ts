import { OG_TTL_SECONDS, OG_MAX_BYTES, isOgPng, readOgBytes, type OgStorage } from './cache'

export interface OgR2Bucket {
  get(key: string): Promise<null | {
    body: ReadableStream<Uint8Array>
    size: number
    httpMetadata?: { contentType?: string }
    customMetadata?: Record<string, string>
  }>
  put(key: string, body: ArrayBuffer, options: {
    httpMetadata: { contentType: string; cacheControl: string }
    customMetadata: Record<string, string>
  }): Promise<unknown>
}

/** A private bucket binding; public cards are served by the existing OG routes. */
export function createR2OgStorage(bucket: () => Promise<OgR2Bucket>): OgStorage {
  return {
    async get(key, signal) {
      signal.throwIfAborted()
      const object = await (await bucket()).get(key)
      if (!object) return null
      const generatedAt = Number(object.customMetadata?.generatedAt)
      if (signal.aborted || object.httpMetadata?.contentType !== 'image/png'
        || object.size <= 0 || object.size > OG_MAX_BYTES
        || !Number.isFinite(generatedAt) || generatedAt > Date.now()
        || Date.now() - generatedAt >= OG_TTL_SECONDS * 1000) {
        await object.body.cancel()
        signal.throwIfAborted()
        return null
      }
      const body = await readOgBytes(object.body)
      signal.throwIfAborted()
      if (!isOgPng({ body, contentType: 'image/png' })) return null
      return { body, contentType: 'image/png', generatedAt }
    },
    async put(key, image, signal) {
      signal.throwIfAborted()
      if (!isOgPng(image) || !Number.isFinite(image.generatedAt)
        || image.generatedAt > Date.now()
        || Date.now() - image.generatedAt >= OG_TTL_SECONDS * 1000) {
        throw new Error('Invalid OG cache image')
      }
      await (await bucket()).put(key, image.body.slice().buffer, {
        httpMetadata: { contentType: 'image/png', cacheControl: `public, max-age=${OG_TTL_SECONDS}` },
        customMetadata: { generatedAt: String(image.generatedAt) },
      })
      signal.throwIfAborted()
    },
  }
}
