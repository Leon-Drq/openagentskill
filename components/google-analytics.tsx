'use client'

import Link from 'next/link'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getLocaleFromRoute } from '@/lib/i18n/config'
import { siteCopy } from '@/lib/i18n/site-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  trackAnalyticsPageView,
  updateAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analytics'

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = getLocaleFromRoute(pathname, searchParams.get('lang'))
  const search = searchParams.toString()
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined)

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

  useEffect(() => {
    const path = search ? `${pathname}?${search}` : pathname
    let attempts = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const sendPageView = () => {
      if (window.gtag) {
        trackAnalyticsPageView(path)
        return
      }

      attempts += 1
      if (attempts < 20) timeoutId = setTimeout(sendPageView, 250)
    }

    sendPageView()
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [pathname, search])

  function chooseConsent(nextConsent: AnalyticsConsent) {
    updateAnalyticsConsent(nextConsent)
    setConsent(nextConsent)
  }

  const bootstrap = `
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    var analyticsConsent = 'denied';
    try {
      analyticsConsent = window.localStorage.getItem('${ANALYTICS_CONSENT_STORAGE_KEY}') === 'granted' ? 'granted' : 'denied';
    } catch (error) {}
    window.gtag('consent', 'default', {
      analytics_storage: analyticsConsent,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500
    });
    window.gtag('js', new Date());
    window.gtag('config', '${measurementId}', {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  `

  return (
    <>
      <Script
        id="openagentskill-google-analytics-bootstrap"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: bootstrap }}
      />
      <Script
        id="openagentskill-google-analytics"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />

      {consent === null && (
        <aside
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 px-4 py-4 shadow-[0_-12px_32px_rgba(26,24,20,0.08)] backdrop-blur sm:px-6"
          aria-label={siteCopy(locale, 'Analytics preferences')}
          lang={locale}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-sm leading-6 text-secondary">
              {locale === 'en' ? 'OpenAgentSkill uses privacy-conscious analytics to understand which pages and product flows are useful. No task text or private repository data is sent to Google.' : siteCopy(locale, 'Analytics notice')}{' '}
              <Link href={getLocalizedNavigationHref('/privacy', locale)} className="font-medium text-foreground underline underline-offset-4">
                {siteCopy(locale, 'Privacy details')}
              </Link>
            </p>
            <div className="flex shrink-0 flex-col gap-2 min-[420px]:flex-row">
              <button
                type="button"
                onClick={() => chooseConsent('denied')}
                className="min-h-10 border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground/45"
              >
                {siteCopy(locale, 'Necessary only')}
              </button>
              <button
                type="button"
                onClick={() => chooseConsent('granted')}
                className="min-h-10 bg-[#006b4f] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {siteCopy(locale, 'Allow analytics')}
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
