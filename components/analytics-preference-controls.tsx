'use client'

import { useEffect, useState } from 'react'
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  updateAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analytics'

export function AnalyticsPreferenceControls() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
        setConsent(stored === 'granted' || stored === 'denied' ? stored : null)
      } catch {
        setConsent(null)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  function choose(nextConsent: AnalyticsConsent) {
    updateAnalyticsConsent(nextConsent)
    setConsent(nextConsent)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        aria-pressed={consent === 'denied'}
        onClick={() => choose('denied')}
        className="h-11 border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-foreground/45 aria-pressed:border-foreground aria-pressed:bg-card"
      >
        Necessary only
      </button>
      <button
        type="button"
        aria-pressed={consent === 'granted'}
        onClick={() => choose('granted')}
        className="h-11 bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-[#006b4f]"
      >
        Allow analytics
      </button>
    </div>
  )
}
