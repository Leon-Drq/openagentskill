import { createHash } from 'node:crypto'

export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const safePath = (value) => typeof value === 'string' && value.length < 240 && /^[a-zA-Z0-9_./ -]+$/.test(value) && !value.startsWith('/') && value.split('/').every((part) => part && part !== '.' && part !== '..')
export const identity = (source, asset) => `${source}:${asset}`
export const slugFor = (source, asset) => `auto-${source}-${asset.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,60)}-${digest(identity(source, asset)).slice(0,10)}`

export function candidates(tree, rules) {
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete repository tree; refusing partial discovery')
  return tree.tree.filter((item) => item.type === 'blob' && item.mode === '100644' && safePath(item.path) && /\.(png|jpe?g|webp)$/i.test(item.path))
    .flatMap((item) => {
      const rule = rules.find((r) => item.path.startsWith(r.prefix) && !item.path.slice(r.prefix.length).includes('/') && (!r.suffix || item.path.endsWith(r.suffix)))
      if (!rule) return []
      // A nested license or notice overrides the root license; require an explicit source review.
      const parents = item.path.split('/').slice(0,-1)
      const nested = tree.tree.some((file) => /(?:^|\/)(?:license|copying|notice)(?:\.[^/]*)?$/i.test(file.path) && parents.some((_, i) => file.path.startsWith(`${parents.slice(0,i+1).join('/')}/`) && file.path.split('/').length === i+2))
      return [{ ...item, rule, nested }]
    }).sort((a,b) => a.path.localeCompare(b.path, 'en'))
}

export async function boundedFetch(url, { token, maxBytes = 10*1024*1024, fetcher = fetch, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const target = new URL(url)
  if (!['api.github.com', 'raw.githubusercontent.com'].includes(target.hostname) || target.protocol !== 'https:' || target.username || target.password) throw new Error('Unapproved source host')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'OpenAgentSkill-Gallery/1.0', ...(target.hostname === 'api.github.com' && token ? { Authorization: `Bearer ${token}` } : {}) } })
      if (!response.ok) {
        const error = new Error(`Source HTTP ${response.status}`)
        error.retryable = response.status === 429 || response.status >= 500
        await response.body?.cancel()
        throw error
      }
      if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw new Error('Source exceeds byte limit') }
      const chunks = []; let size = 0
      for await (const chunk of response.body) { size += chunk.length; if (size > maxBytes) { throw new Error('Source exceeds byte limit') }; chunks.push(chunk) }
      return Buffer.concat(chunks)
    } catch (error) {
      if (attempt === 2 || (error.retryable !== true && error.name !== 'TimeoutError' && !(error instanceof TypeError))) throw error
      await sleep(1000 * 2 ** attempt)
    }
  }
}

export function planItem({ old, hash, knownHashes }) {
  if (old?.sha256 === hash) return 'unchanged'
  if (knownHashes.has(hash)) return 'duplicate'
  return old ? 'updated' : 'added'
}
