import handler from '../.open-next/worker.js'
import schedules from '../vercel.json' with { type: 'json' }
import { dispatchScheduled, migrationResponse, previewHeaders } from './runtime.mjs'

export { DOQueueHandler } from '../.open-next/worker.js'

export default {
  async fetch(request, env, ctx) {
    const intercepted = migrationResponse(request, env)
    const response = intercepted || await handler.fetch(request, env, ctx)
    return previewHeaders(response, env)
  },
  async scheduled(event, env) {
    await dispatchScheduled(event, env, schedules.crons)
  },
}
