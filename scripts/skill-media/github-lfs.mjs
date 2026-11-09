import { digest } from './discovery.mjs'

// GitHub's raw endpoint may serve a small LFS pointer instead of image bytes.
// Resolve only the same public repository/path at an immutable commit. Never
// use a pointer-supplied URL or send GitHub credentials to the media endpoint.
export async function resolveGitHubLfs(bytes, rawUrl, limit, { fetcher = fetch } = {}) {
  if (bytes.length > 1024 || !bytes.toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1')) return bytes
  const pointer = /^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize ([1-9]\d*)\r?\n?$/.exec(bytes.toString('utf8'))
  if (!pointer) throw Error('Invalid LFS pointer')
  const size = Number(pointer[2])
  if (!Number.isSafeInteger(size) || size > limit) throw Error('LFS asset exceeds byte limit')
  const raw = new URL(rawUrl)
  if (raw.origin !== 'https://raw.githubusercontent.com' || raw.username || raw.password || raw.search || raw.hash || !/^\/[\w.-]+\/[\w.-]+\/[a-f0-9]{40}\/.+/.test(raw.pathname)) throw Error('LFS requires a pinned GitHub source')
  const url = `https://media.githubusercontent.com/media${raw.pathname}`
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'OpenAgentSkill-MediaCollector/1.0' } })
  if (!response.ok || Number(response.headers.get('content-length')) > size) {
    await response.body?.cancel()
    throw Error(`LFS source unavailable or oversized: HTTP ${response.status}`)
  }
  const chunks = []; let received = 0
  for await (const chunk of response.body) {
    received += chunk.length
    if (received > size) throw Error('LFS asset exceeds declared size')
    chunks.push(chunk)
  }
  const content = Buffer.concat(chunks)
  if (content.length !== size || digest(content) !== pointer[1]) throw Error('LFS content hash or size mismatch')
  return content
}
