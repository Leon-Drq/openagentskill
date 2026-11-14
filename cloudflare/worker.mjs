import schedules from '../vercel.json' with { type: 'json' }
import { dispatchScheduled, migrationResponse, previewHeaders, stagingResponse } from './runtime.mjs'
import { publicDirectoryResponse } from './public-directory-cache.mjs'
import { buildId } from '../.open-next/directory-cache-build.mjs'
import { searchCostGuard } from './search-cost-guard.mjs'

export { DOQueueHandler } from '../.open-next/.build/durable-objects/queue.js'

async function renderNext(request, env, ctx) {
  // Cache hits and crawler backoff should not initialize Next/middleware.
  const { default: handler } = await import('../.open-next/worker.js')
  return handler.fetch(request, env, ctx)
}

export default {
  async fetch(request, env, ctx) {
    let searchLimitState
    const intercepted = await stagingResponse(request, env) || migrationResponse(request, env)
    let response = intercepted || await searchCostGuard(request, env, state => { searchLimitState = state }) || await publicDirectoryResponse(request, env, ctx, buildId,
      input => renderNext(input, env, ctx))
    if (searchLimitState) {
      response = new Response(response.body, response)
      response.headers.set('X-OAS-Search-Limit', searchLimitState)
    }
    return previewHeaders(response, env)
  },
  async scheduled(event, env) {
    await dispatchScheduled(event, env, schedules.crons)
  },
}
