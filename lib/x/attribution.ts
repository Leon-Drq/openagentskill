export const X_GROWTH_EXPERIMENT_ID = 'x-feedback-loop-v1'
export const X_GROWTH_EXPERIMENT_DAYS = 14
export const X_GROWTH_EXPERIMENT_TOPICS = 10

const SITE_URL = 'https://www.openagentskill.com'
const SAFE_VALUE = /^[a-z0-9][a-z0-9_-]{0,119}$/i

export interface XAttribution {
  source: 'x'
  medium: string
  campaign: string
  content: string
  experiment_id: string
}

export interface XTrackingInput {
  campaign: string
  content: string
  experimentId?: string
  medium?: string
}

export interface XShareAsset {
  key: 'cover' | 'workflow' | 'picks' | 'trust'
  label: string
  url: string
}

function safeValue(value: string, fallback: string) {
  const normalized = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return SAFE_VALUE.test(normalized) ? normalized : fallback
}

export function createXTrackingCode(input: {
  lane: string
  edition: string
  format?: string
}) {
  const lane = safeValue(input.lane, 'general')
  const edition = safeValue(input.edition.replace(/[^0-9]/g, ''), 'edition')
  const format = safeValue(input.format || 'shortlist', 'content')
  const nonce = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10)
  return `x-${format}-${lane}-${edition}-${nonce}`
}

export function buildXTrackingUrl(path: string, input: XTrackingInput) {
  const url = new URL(path, SITE_URL)
  url.searchParams.set('ref', 'x')
  url.searchParams.set('utm_source', 'x')
  url.searchParams.set('utm_medium', safeValue(input.medium || 'organic', 'organic'))
  url.searchParams.set('utm_campaign', safeValue(input.campaign, 'x-growth'))
  url.searchParams.set('utm_content', safeValue(input.content, 'x-content'))
  url.searchParams.set('experiment', safeValue(input.experimentId || X_GROWTH_EXPERIMENT_ID, X_GROWTH_EXPERIMENT_ID))
  return url.toString()
}

export function getXShareAssets(
  lane: string,
  edition: string,
  trackingCode: string
): XShareAsset[] {
  const validLane = safeValue(lane, 'research')
  const validEdition = safeValue(edition.replace(/[^0-9]/g, ''), 'edition')
  const validTrackingCode = safeValue(trackingCode, 'x-content')

  return [
    ['cover', 'Cover'],
    ['workflow', 'Workflow'],
    ['picks', 'Picks'],
    ['trust', 'Trust'],
  ].map(([key, label]) => {
    const url = new URL(`/shortlists/${validLane}/social/${key}/opengraph-image`, SITE_URL)
    url.searchParams.set('edition', validEdition)
    url.searchParams.set('utm_content', validTrackingCode)
    return { key: key as XShareAsset['key'], label, url: url.toString() }
  })
}

export function getXAttributionFromSearch(search: string): XAttribution | null {
  const params = new URLSearchParams(search)
  const source = params.get('utm_source')?.toLowerCase()
  const ref = params.get('ref')?.toLowerCase()
  if (source !== 'x' && ref !== 'x') return null

  const content = params.get('utm_content') || ''
  if (!SAFE_VALUE.test(content)) return null

  const campaign = params.get('utm_campaign') || 'x-growth'
  const medium = params.get('utm_medium') || 'organic'
  const experimentId = params.get('experiment') || X_GROWTH_EXPERIMENT_ID

  return {
    source: 'x',
    medium: safeValue(medium, 'organic'),
    campaign: safeValue(campaign, 'x-growth'),
    content: safeValue(content, 'x-content'),
    experiment_id: safeValue(experimentId, X_GROWTH_EXPERIMENT_ID),
  }
}
