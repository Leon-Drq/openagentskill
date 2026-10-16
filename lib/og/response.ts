import 'server-only'
import { createOgCache, ogCacheKey } from './cache'
import { createOgStorage } from '../og-storage'

const cached = createOgCache({
  storage: createOgStorage(),
  onEvent: event => console.info('[og-cache]', JSON.stringify(event)),
})

export async function renderOgOrCached(kind: string, inputs: readonly unknown[], render: () => Promise<Response> | Response, persist = true) {
  return cached(await ogCacheKey(kind, inputs), render, persist)
}
