import {pausedResponse} from './paused-response.mjs'

// Keep the existing namespace and stored queue state for an explicit resume.
// An outstanding alarm must stop here instead of restarting revalidation.
export class DOQueueHandler {
  constructor(state) { this.state = state }
  async alarm() { await this.state.storage.deleteAlarm() }
  async fetch(request) { return pausedResponse(request) }
}

const worker = {
  fetch: pausedResponse,
  // Cron removal can take time to propagate; stale deliveries must be harmless.
  async scheduled() {},
}

export default worker
