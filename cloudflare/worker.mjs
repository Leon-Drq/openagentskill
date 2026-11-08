import handler from '../.open-next/worker.js'
import schedules from '../vercel.json' with { type: 'json' }
import { dispatchScheduled, migrationResponse, previewHeaders, stagingResponse } from './runtime.mjs'
import { publicDirectoryResponse } from './public-directory-cache.mjs'
import { buildId } from '../.open-next/directory-cache-build.mjs'

export { DOQueueHandler } from '../.open-next/worker.js'

export default {
  async fetch(request, env, ctx) {
    const intercepted = await stagingResponse(request, env) || migrationResponse(request, env)
    const response = intercepted || await publicDirectoryResponse(request, env, ctx, buildId,
      input => handler.fetch(input, env, ctx))
    return previewHeaders(response, env)
  },
  async scheduled(event, env) {
    await dispatchScheduled(event, env, schedules.crons)
  },
}
