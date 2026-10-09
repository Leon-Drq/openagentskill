'use client'

// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { ACTIVATION_EVENTS, GROWTH_ATTRIBUTION_KEY, GROWTH_SESSION_MS, analyticsPageType, analyticsPath, inferGrowthAttribution, readGrowthSession, type GrowthSession } from './growth-attribution.ts'

export type AnalyticsParameterValue = string | number | boolean

export type AnalyticsEventName =
  | 'growth_activation'
  | 'partner_outbound'
  | 'directory_search'
  | 'directory_results'
  | 'directory_skill_open'
  | 'skill_handoff_target'
  | 'skill_handoff_error'
  | 'showcase_view'
  | 'showcase_creator_open'
  | 'showcase_filter'
  | 'showcase_open'
  | 'showcase_task_copy'
  | 'showcase_handoff_copy'
  | 'showcase_start'
  | 'showcase_media_play'
  | 'showcase_vote'
  | 'showcase_share_open'
  | 'showcase_share_complete'
  | 'showcase_share_copy'
  | 'showcase_share_visit'
  | 'skill_view'
  | 'skill_resolve_request'
  | 'skill_install_copy'
  | 'skill_install_start'
  | 'skill_save'
  | 'skill_compare'
  | 'skill_outbound_github'
  | 'skill_outbound_docs'
  | 'skill_claim_start'
  | 'skill_claim_submit'
  | 'skill_claim_verified'
  | 'creator_claim_all'
  | 'skill_share_copy'
  | 'creator_github_connect_start'
  | 'creator_github_connected'
  | 'creator_profile_published'
  | 'creator_badge_copy'
  | 'creator_share_open'
  | 'resolve_request'
  | 'resolve_success'
  | 'resolve_no_match'
  | 'resolve_error'
  | 'resolve_copy'
  | 'resolve_open_skill'
  | 'resolve_open_audit'
  | 'resolve_outbound_github'
  | 'localized_resolve_request'
  | 'localized_resolve_success'
  | 'localized_resolve_no_match'
  | 'localized_resolve_error'
  | 'localized_resolve_copy_install'
  | 'skill_submission_result'
  | 'skill_submission_accepted'
  | 'skill_submission_share_open'

export type AnalyticsConsent = 'granted' | 'denied'

export const ANALYTICS_CONSENT_STORAGE_KEY = 'openagentskill.analytics-consent'
export const ANALYTICS_CONSENT_EVENT = 'openagentskill:analytics-consent'

let memoryConsent: AnalyticsConsent | undefined
let growthSession: GrowthSession | null = null

function analyticsAllowed() {
  if (memoryConsent) return memoryConsent === 'granted'
  try { return window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === 'granted' } catch { return false }
}

function session() {
  const now = Date.now()
  try { growthSession = readGrowthSession(window.sessionStorage.getItem(GROWTH_ATTRIBUTION_KEY), now) || growthSession } catch { /* Use in-memory attribution when storage is unavailable. */ }
  if (!growthSession || now - growthSession.lastSeen >= GROWTH_SESSION_MS) {
    growthSession = { attribution: inferGrowthAttribution(window.location.href, document.referrer), lastSeen: now, activated: false }
  }
  growthSession.lastSeen = now
  return growthSession
}

function saveSession(value: GrowthSession) {
  try { window.sessionStorage.setItem(GROWTH_ATTRIBUTION_KEY, JSON.stringify(value)) } catch { /* Never block a product action. */ }
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (command: string, ...args: unknown[]) => void
  }
}

function compactParameters(parameters: Record<string, AnalyticsParameterValue | null | undefined>) {
  return Object.fromEntries(
    Object.entries(parameters)
      .filter((entry): entry is [string, AnalyticsParameterValue] => entry[1] !== null && entry[1] !== undefined)
      .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 100) : value])
  )
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  parameters: Record<string, AnalyticsParameterValue | null | undefined> = {}
) {
  if (typeof window === 'undefined' || !window.gtag || !analyticsAllowed()) return
  const current = session()
  const context = { ...current.attribution, page_type: analyticsPageType(window.location.pathname) }
  const location = `${window.location.origin}${analyticsPath(window.location.pathname)}`
  window.gtag('event', eventName, compactParameters({ ...parameters, ...context, page_location: location }))
  if (ACTIVATION_EVENTS.has(eventName) && !current.activated) {
    current.activated = true
    window.gtag('event', 'growth_activation', { ...context, page_location: location, activation_action: eventName })
  }
  saveSession(current)
}

export function trackAnalyticsPageView(path: string) {
  if (typeof window === 'undefined' || !window.gtag || !analyticsAllowed()) return
  const current = session()
  window.gtag('event', 'page_view', {
    ...current.attribution,
    page_type: analyticsPageType(path),
    page_path: analyticsPath(path),
    page_location: `${window.location.origin}${analyticsPath(path)}`,
    page_referrer: document.referrer ? new URL(document.referrer).origin : '',
    page_title: document.title,
  })
  saveSession(current)
}

export function updateAnalyticsConsent(consent: AnalyticsConsent) {
  if (typeof window === 'undefined') return
  memoryConsent = consent
  if (consent === 'denied') {
    growthSession = null
    try { window.sessionStorage.removeItem(GROWTH_ATTRIBUTION_KEY) } catch { /* Storage may be unavailable. */ }
  }

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent)
  } catch {
    // Consent still applies for this page even when storage is unavailable.
  }

  window.gtag?.('consent', 'update', {
    analytics_storage: consent,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  window.dispatchEvent?.(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }))
}
