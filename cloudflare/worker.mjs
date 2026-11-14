import handler from '../.open-next/worker.js'
import schedules from '../vercel.json' with { type: 'json' }
import { dispatchScheduled, migrationResponse, previewHeaders, stagingResponse } from './runtime.mjs'
import { publicDirectoryResponse } from './public-directory-cache.mjs'
import { buildId } from '../.open-next/directory-cache-build.mjs'
import { searchCostGuard } from './search-cost-guard.mjs'

export { DOQueueHandler } from '../.open-next/worker.js'

export default {
  async fetch(request, env, ctx) {
    let searchLimitState
    const intercepted = await stagingResponse(request, env) || migrationResponse(request, env)
    let response = intercepted || await searchCostGuard(request, env, state => { searchLimitState = state }) || await publicDirectoryResponse(request, env, ctx, buildId,
      input => handler.fetch(input, env, ctx))
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
