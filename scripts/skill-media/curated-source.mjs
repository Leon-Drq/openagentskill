import { createHash } from 'node:crypto'
import { safePath, safeRepo } from './discovery.mjs'

export function curatedSourceUrls(source, file, releaseTag) {
  if (!safeRepo(source.repository) || !/^[a-f0-9]{40}$/.test(source.revision) || !safePath(file)) throw Error('Invalid pinned source')
  if (releaseTag !== undefined) {
    if (typeof releaseTag !== 'string' || !/^[\w-][\w.-]*$/.test(releaseTag) || file.includes('/')) throw Error('Invalid release asset')
    const url = `https://github.com/${source.repository}/releases/download/${releaseTag}/${encodeURIComponent(file)}`
    return { download: url, sourceUrl: url }
  }
  const tail = `${source.repository}/${source.revision}/${file.split('/').map(encodeURIComponent).join('/')}`
  return { download: `https://raw.githubusercontent.com/${tail}`, sourceUrl: `https://github.com/${source.repository}/blob/${source.revision}/${file}` }
}

// No credentials are sent. Release assets may redirect only to GitHub's asset CDN.
// The reviewed SHA-256, not the mutable release tag, identifies the bytes.
export async function fetchCuratedBytes(url, expectedHash, limit, { fetcher = fetch } = {}) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw Error('Invalid source hash')
  let target = new URL(url)
  if (!['raw.githubusercontent.com', 'github.com'].includes(target.hostname)) throw Error('Invalid source host')
  for (let hop = 0; hop < 4; hop++) {
    if (target.protocol !== 'https:' || target.username || target.password || target.port) throw Error('Invalid source URL')
    const response = await fetcher(target, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) throw Error('Missing source redirect')
      const next = new URL(location, target)
      if (next.hostname !== 'release-assets.githubusercontent.com') throw Error('Untrusted source redirect')
      target = next
      continue
    }
    if (!response.ok || Number(response.headers.get('content-length')) > limit) {
      await response.body?.cancel()
      throw Error('Source unavailable or too large')
    }
    const chunks = []; let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > limit) throw Error('Source too large')
      chunks.push(chunk)
    }
    const bytes = Buffer.concat(chunks)
    if (createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw Error('Source hash changed')
    return bytes
  }
  throw Error('Too many source redirects')
}
