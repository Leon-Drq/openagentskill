import { getXAttributionFromSearch, type XAttribution } from '@/lib/x/attribution'

const STORAGE_KEY = 'openagentskill.xAttribution'
const MAX_ATTRIBUTION_AGE_MS = 1000 * 60 * 45

interface StoredXAttribution extends XAttribution {
  captured_at: number
  landing_path: string
}

function isStoredXAttribution(value: unknown): value is StoredXAttribution {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<StoredXAttribution>
  return (
    record.source === 'x' &&
    typeof record.medium === 'string' &&
    typeof record.campaign === 'string' &&
    typeof record.content === 'string' &&
    typeof record.experiment_id === 'string' &&
    typeof record.captured_at === 'number' &&
    typeof record.landing_path === 'string'
  )
}

export function getDirectXAttribution() {
  if (typeof window === 'undefined') return null
  return getXAttributionFromSearch(window.location.search)
}

export function persistXAttribution(attribution: XAttribution) {
  if (typeof window === 'undefined') return null
  const stored: StoredXAttribution = {
    ...attribution,
    captured_at: Date.now(),
    landing_path: `${window.location.pathname}${window.location.search}`.slice(0, 500),
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Attribution is helpful analytics, never a requirement for using a skill.
  }
  return stored
}

export function getActiveXAttribution() {
  if (typeof window === 'undefined') return null
  const direct = getDirectXAttribution()
  if (direct) return persistXAttribution(direct)

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as unknown
    if (!isStoredXAttribution(stored) || Date.now() - stored.captured_at > MAX_ATTRIBUTION_AGE_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return stored
  } catch {
    return null
  }
}
