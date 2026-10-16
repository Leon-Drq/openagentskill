import 'server-only'
import { get, put } from '@vercel/blob'
import { OG_TTL_SECONDS, OG_MAX_BYTES, readOgBytes, type OgStorage } from './og/cache'

/** Only server-owned public cards use durable storage. Free-form previews do not. */
export function createOgStorage(env = process.env): OgStorage | undefined {
  if (env.OG_STORAGE_ENABLED === '0' || env.OG_STORAGE_ENABLED === 'false') return undefined
  // Preview branches must not overwrite production cards with unreleased templates.
  if (env.VERCEL_ENV === 'preview') return undefined
  // The SDK can obtain OIDC from Vercel's request context, not only process.env.
  if (!env.BLOB_READ_WRITE_TOKEN && !env.BLOB_STORE_ID) return undefined
  return {
    async get(key, signal) {
      // One content+metadata read, not a HEAD followed by a second billed request.
      // Bypass Blob's CDN so an overwrite cannot serve an expired PNG again.
      const result = await get(key, { access: 'public', useCache: false, abortSignal: signal })
      if (!result || result.statusCode !== 200 || !result.stream) return null
      const generatedAt = result.blob.uploadedAt.getTime()
      if (result.blob.contentType !== 'image/png' || !result.blob.size || result.blob.size > OG_MAX_BYTES
        || Date.now() - generatedAt >= OG_TTL_SECONDS * 1000) {
        await result.stream.cancel()
        return null
      }
      return { body: await readOgBytes(result.stream), contentType: 'image/png', generatedAt }
    },
    async put(key, image, signal) {
      await put(key, image.body.slice().buffer, {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        contentType: 'image/png', cacheControlMaxAge: OG_TTL_SECONDS, abortSignal: signal,
      })
    },
  }
}
