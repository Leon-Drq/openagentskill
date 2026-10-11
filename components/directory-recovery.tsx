'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { directoryCopy, directoryLabel } from '@/lib/i18n/directory-copy'
import type { Locale } from '@/lib/i18n/config'

const RETRY_COOLDOWN_MS = 60_000
const AUTO_RETRY_DELAY_MS = 65_000

// Only mounted for a failed directory response. A healthy response removes
// this notice; a failed retry keeps the fallback and never starts a poll loop.
export function DirectoryRecovery({ locale, empty }: { locale: Locale; empty: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [coolingDown, setCoolingDown] = useState(false)
  const attempted = useRef(false)
  const nextRetryAt = useRef(0)
  const retry = useCallback(() => {
    if (Date.now() < nextRetryAt.current) return
    attempted.current = true
    nextRetryAt.current = Date.now() + RETRY_COOLDOWN_MS
    setCoolingDown(true)
    // Re-fetch the current route, preserving filters, language and scroll.
    startTransition(() => router.refresh())
  }, [router])

  useEffect(() => {
    if (!coolingDown) return
    const timer = window.setTimeout(() => setCoolingDown(false), RETRY_COOLDOWN_MS)
    return () => window.clearTimeout(timer)
  }, [coolingDown])

  useEffect(() => {
    let ready = false
    const recover = () => {
      if (attempted.current || !ready || document.visibilityState !== 'visible' || !navigator.onLine) return
      retry()
    }
    const timer = window.setTimeout(() => { ready = true; recover() }, AUTO_RETRY_DELAY_MS)
    // If the timer elapsed offline or in the background, try once on return.
    window.addEventListener('online', recover)
    document.addEventListener('visibilitychange', recover)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [retry])

  return (
    <div data-directory-recovery className="my-5 flex flex-col items-start gap-3 border-l-2 border-amber-600 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <p role="status">{directoryLabel(locale, empty ? 'catalogUnavailable' : 'dataUnavailable')}</p>
      <button type="button" onClick={retry} disabled={pending || coolingDown}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[8px] border border-amber-800/30 px-3 py-2 font-medium hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:opacity-60">
        {pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
        {pending ? directoryCopy(locale).loading : directoryLabel(locale, coolingDown ? 'retryLater' : 'retry')}
      </button>
    </div>
  )
}
