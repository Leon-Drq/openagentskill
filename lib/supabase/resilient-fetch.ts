type CircuitState = {
  consecutiveFailures: number
  openUntil: number
  probeInFlight: boolean
  generation: number
}

export type SupabaseCircuitScope = 'public-read' | 'public-catalog' | 'skill-lookup' | 'skill-search' | 'skill-search-broad' | 'skill-support' | 'sitemap' | 'telemetry' | 'admin' | 'x-automation'

type CircuitGlobal = typeof globalThis & {
  __openagentskillSupabaseCircuits?: Partial<Record<SupabaseCircuitScope, CircuitState>>
  __openagentskillSupabaseQuotas?: Map<string, CircuitState>
}

const FAILURE_THRESHOLD = 3
const OPEN_INTERVAL_MS = 15_000
const QUOTA_INTERVAL_MS = 60_000
const MAX_RETRY_AFTER_MS = 300_000
const EGRESS_QUOTA_INTERVAL_MS = 10 * 60_000

function quotaCircuit(input: RequestInfo | URL): CircuitState | null {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (!url.pathname.startsWith('/rest/v1/')) return null
  if (process.env.SUPABASE_DATA_PAUSED === '1') throw new Error('Supabase data reads and writes are paused; saved public browsing only')
  const shared = globalThis as CircuitGlobal
  const quotas = shared.__openagentskillSupabaseQuotas ??= new Map()
  if (!quotas.has(url.origin)) {
    if (quotas.size >= 4) quotas.delete(quotas.keys().next().value!)
    quotas.set(url.origin, { consecutiveFailures: 0, openUntil: 0, probeInFlight: false, generation: 0 })
  }
  return quotas.get(url.origin)!
}

function getCircuitState(scope: SupabaseCircuitScope): CircuitState {
  const shared = globalThis as CircuitGlobal
  const circuits = shared.__openagentskillSupabaseCircuits ??= {}
  if (!circuits[scope]) {
    circuits[scope] = {
      consecutiveFailures: 0,
      openUntil: 0,
      probeInFlight: false,
      generation: 0,
    }
  }
  return circuits[scope]
}

function recordFailure(state: CircuitState, backoffMs?: number) {
  state.consecutiveFailures += 1
  // Explicit quota/rate limits should pause immediately, not be counted as
  // healthy HTTP responses or require three more requests to a blocked service.
  if (backoffMs !== undefined) state.consecutiveFailures = Math.max(FAILURE_THRESHOLD, state.consecutiveFailures)
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + (backoffMs ?? OPEN_INTERVAL_MS)
    state.generation += 1
    state.probeInFlight = false
  }
}

function responseBackoff(response: Response): number {
  const minimum = response.status === 402 ? QUOTA_INTERVAL_MS : OPEN_INTERVAL_MS
  const header = response.headers.get('retry-after')
  if (!header) return minimum
  const seconds = Number(header)
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now()
  return Number.isFinite(delay) ? Math.min(MAX_RETRY_AFTER_MS, Math.max(minimum, delay)) : minimum
}

function recordSuccess(state: CircuitState) {
  if (state.probeInFlight) state.generation += 1
  state.consecutiveFailures = 0
  state.openUntil = 0
  state.probeInFlight = false
}

/**
 * Bound Supabase requests and stop a degraded gateway from consuming every
 * serverless invocation. The circuit is shared by warm invocations of the
 * same workload, opens after three failures (immediately for quota/rate limits), and allows one half-open probe
 * after the cooldown. Optional/bulk reads must not trip critical lookups or
 * writes. The fixed scope set keeps process-local state bounded.
 */
export function createResilientTimeoutFetch(timeoutMs: number, scope: SupabaseCircuitScope = 'public-read'): typeof fetch {
  return async (input, init) => {
    const externalSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    externalSignal?.throwIfAborted()
    // Egress restriction is project-wide, unlike a query timeout or 429.
    // Share its cooldown across catalog, search, stats, sitemap and admin
    // scopes. Auth/Storage routes and other projects are not affected.
    const quota = quotaCircuit(input)
    let ownsQuotaProbe = false
    if (quota) {
      if (quota.openUntil > Date.now()) throw new Error('Supabase project egress quota is temporarily restricted')
      if (quota.consecutiveFailures >= FAILURE_THRESHOLD) {
        if (quota.probeInFlight) throw new Error('Supabase quota recovery probe is already running')
        quota.probeInFlight = true
        ownsQuotaProbe = true
      }
    }
    const quotaGeneration = quota?.generation
    const state = getCircuitState(scope)
    const now = Date.now()
    let ownsProbe = false

    if (state.openUntil > now) {
      if (ownsQuotaProbe && quota) quota.probeInFlight = false
      throw new Error('Supabase data circuit is temporarily open')
    }

    if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
      if (state.probeInFlight) {
        if (ownsQuotaProbe && quota) quota.probeInFlight = false
        throw new Error('Supabase recovery probe is already running')
      }
      state.probeInFlight = true
      ownsProbe = true
    }

    const generation = state.generation
    const controller = new AbortController()
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, controller.signal])
      : controller.signal
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    let onAbort: () => void = () => undefined
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(signal.reason)
      signal.addEventListener('abort', onAbort, { once: true })
    })

    try {
      const readResponse = async () => {
        const response = await fetch(input, { ...init, signal })
        // fetch resolves when headers arrive. Keep the deadline active until
        // the database body is complete, so a stalled JSON stream cannot leave
        // a build or an ISR refresh hanging after the timer was cleared.
        const body = response.body === null ? null : await response.arrayBuffer()
        signal.throwIfAborted()
        return { response, body }
      }
      // Also bound wrappers that do not promptly observe the AbortSignal.
      const { response, body } = await Promise.race([readResponse(), aborted])
      if (quota && quota.generation === quotaGeneration) {
        if (response.status === 402 && body && new TextDecoder().decode(body.slice(0, 65536)).includes('exceed_egress_quota')) {
          recordFailure(quota, EGRESS_QUOTA_INTERVAL_MS)
        } else if (ownsQuotaProbe) {
          if (response.ok) recordSuccess(quota)
          else recordFailure(quota, EGRESS_QUOTA_INTERVAL_MS)
        }
      }
      // Requests started before a circuit opened cannot close it late or
      // extend its cooldown. Only the recovery probe can change that state.
      if (state.generation === generation) {
        if (response.status === 402 || response.status === 429) recordFailure(state, responseBackoff(response))
        else if (response.status >= 500) recordFailure(state)
        else recordSuccess(state)
      }
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
    } catch (error) {
      // A caller navigating away/cancelling work is not a database outage.
      if (!externalSignal?.aborted && state.generation === generation) recordFailure(state)
      if (ownsQuotaProbe && quota && quota.generation === quotaGeneration && !externalSignal?.aborted) recordFailure(quota, EGRESS_QUOTA_INTERVAL_MS)
      throw error
    } finally {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
      if (ownsProbe && state.generation === generation) state.probeInFlight = false
      if (ownsQuotaProbe && quota && quota.generation === quotaGeneration) quota.probeInFlight = false
    }
  }
}
