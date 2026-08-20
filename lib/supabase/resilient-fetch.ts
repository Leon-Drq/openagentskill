type CircuitState = {
  consecutiveFailures: number
  openUntil: number
  probeInFlight: boolean
}

type CircuitGlobal = typeof globalThis & {
  __openagentskillSupabaseCircuit?: CircuitState
}

const FAILURE_THRESHOLD = 3
const OPEN_INTERVAL_MS = 15_000

function getCircuitState(): CircuitState {
  const shared = globalThis as CircuitGlobal
  if (!shared.__openagentskillSupabaseCircuit) {
    shared.__openagentskillSupabaseCircuit = {
      consecutiveFailures: 0,
      openUntil: 0,
      probeInFlight: false,
    }
  }
  return shared.__openagentskillSupabaseCircuit
}

function recordFailure(state: CircuitState) {
  state.consecutiveFailures += 1
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + OPEN_INTERVAL_MS
  }
}

function recordSuccess(state: CircuitState) {
  state.consecutiveFailures = 0
  state.openUntil = 0
}

/**
 * Bound Supabase requests and stop a degraded gateway from consuming every
 * serverless invocation. The circuit is shared by warm invocations of the
 * same function bundle, opens after three failures, and automatically allows
 * one half-open probe after the cooldown.
 */
export function createResilientTimeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const state = getCircuitState()
    const now = Date.now()
    let ownsProbe = false

    if (state.openUntil > now) {
      throw new Error('Supabase data circuit is temporarily open')
    }

    if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
      if (state.probeInFlight) {
        throw new Error('Supabase recovery probe is already running')
      }
      state.probeInFlight = true
      ownsProbe = true
    }

    const controller = new AbortController()
    const externalSignal = init?.signal
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, controller.signal])
      : controller.signal
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(input, { ...init, signal })
      if (response.status >= 500) {
        recordFailure(state)
      } else {
        recordSuccess(state)
      }
      return response
    } catch (error) {
      recordFailure(state)
      throw error
    } finally {
      clearTimeout(timeout)
      if (ownsProbe) state.probeInFlight = false
    }
  }
}
