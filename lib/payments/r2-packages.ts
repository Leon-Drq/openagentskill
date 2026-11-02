import { createHash } from 'node:crypto'
import { validRelease, type PackageRelease } from './policy'
import { MAX_DOWNLOAD_BYTES } from '@/lib/skills/download-policy'

export interface PackageR2Bucket {
  head(key: string): Promise<null | { size: number }>
  get(key: string): Promise<null | { size: number; body: ReadableStream<Uint8Array> }>
}

function checkedRelease(release: PackageRelease) {
  if (!validRelease(release, release.skill_slug) || release.size_bytes > MAX_DOWNLOAD_BYTES) {
    throw new Error('package_unavailable')
  }
}

/** Private binding only. Callers must authenticate and check current entitlement. */
export function createR2PackageStorage(bucket: () => Promise<PackageR2Bucket>) {
  return {
    async verify(release: PackageRelease) {
      checkedRelease(release)
      const object = await (await bucket()).head(release.object_path)
      if (!object || object.size !== release.size_bytes) throw new Error('package_unavailable')
    },
    async read(release: PackageRelease) {
      checkedRelease(release)
      const object = await (await bucket()).get(release.object_path)
      if (!object) throw new Error('package_unavailable')
      if (object.size !== release.size_bytes) {
        await object.body.cancel()
        throw new Error('package_unavailable')
      }
      const reader = object.body.getReader()
      const bytes = new Uint8Array(release.size_bytes)
      let offset = 0, complete = false
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) { complete = true; break }
          if (value.byteLength > bytes.byteLength - offset) throw new Error('package_unavailable')
          bytes.set(value, offset)
          offset += value.byteLength
        }
      } finally {
        if (!complete) await reader.cancel().catch(() => {})
        reader.releaseLock()
      }
      if (offset !== release.size_bytes || createHash('sha256').update(bytes).digest('hex') !== release.sha256) {
        throw new Error('package_unavailable')
      }
      return bytes
    },
  }
}

export function cloudflarePackageStorage() {
  return createR2PackageStorage(async () => {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const bindings = getCloudflareContext().env as { SKILL_PACKAGES?: PackageR2Bucket }
    if (!bindings.SKILL_PACKAGES) throw new Error('package_storage_unavailable')
    return bindings.SKILL_PACKAGES
  })
}
