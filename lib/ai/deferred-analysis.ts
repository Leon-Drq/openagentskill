export type AnalysisFailureCode = 'budget_exhausted' | 'cooldown' | 'database_unavailable' | 'provider_unavailable' | 'persistence_failed' | 'input_limit' | 'model_not_priced' | 'invalid_cache'

export class DeferredAnalysisError extends Error {
  readonly code: AnalysisFailureCode
  constructor(message: string, code: AnalysisFailureCode = 'provider_unavailable') {
    super(message)
    this.code = code
    this.name = 'DeferredAnalysisError'
  }
}

/** Retain spending limits and avoid synchronized retries of deferred reviews. */
export function analysisRetryDelayMs(code: string | undefined, jitter = Math.random()) {
  const hours = code === 'budget_exhausted' || code === 'cooldown' || code === 'input_limit' || code === 'model_not_priced' ? 24 : 1
  return (hours * 60 + Math.floor(Math.max(0, Math.min(jitter, 1)) * 15)) * 60_000
}
