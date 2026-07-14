'use client'

export type AnalyticsParameterValue = string | number | boolean

export type AnalyticsEventName =
  | 'skill_view'
  | 'skill_install_copy'
  | 'skill_save'
  | 'skill_compare'
  | 'skill_outbound_github'
  | 'skill_outbound_docs'
  | 'skill_claim_start'
  | 'skill_claim_submit'
  | 'resolve_request'
  | 'resolve_success'
  | 'resolve_no_match'
  | 'resolve_error'
  | 'resolve_copy'
  | 'resolve_open_skill'
  | 'resolve_open_audit'
  | 'resolve_outbound_github'
  | 'skill_submission_result'

export type AnalyticsConsent = 'granted' | 'denied'

export const ANALYTICS_CONSENT_STORAGE_KEY = 'openagentskill.analytics-consent'

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
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', eventName, compactParameters(parameters))
}

export function trackAnalyticsPageView(path: string) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function updateAnalyticsConsent(consent: AnalyticsConsent) {
  if (typeof window === 'undefined') return

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
}
