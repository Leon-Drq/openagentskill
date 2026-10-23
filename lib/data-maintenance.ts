// Shared server/proxy policy. This is an availability switch, never an
// authorization grant. Keep it out of browser bundles and public env vars.
export function isDataPaused() {
  return process.env.SUPABASE_DATA_PAUSED === '1'
}

export const DATA_RETRY_AFTER_SECONDS = 600
export const DATA_UNAVAILABLE = {
  error: 'Live registry data is temporarily unavailable. Please retry later.',
  code: 'data_temporarily_unavailable',
  retry_after: DATA_RETRY_AFTER_SECONDS,
}

export function dataUnavailableHeaders() {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Retry-After': String(DATA_RETRY_AFTER_SECONDS),
    'X-Robots-Tag': 'noindex, follow',
    'X-OAS-Data-Mode': 'paused',
  }
}
