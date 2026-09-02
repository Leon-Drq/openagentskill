'use client'

import { useEffect, useRef } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'

export function CreatorActivationTracker({
  githubConnected,
  profilePublished,
}: {
  githubConnected: boolean
  profilePublished: boolean
}) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    if (githubConnected) {
      trackAnalyticsEvent('creator_github_connected', { placement: 'creator_dashboard' })
    }
    if (profilePublished) {
      trackAnalyticsEvent('creator_profile_published', { placement: 'creator_dashboard' })
    }
  }, [githubConnected, profilePublished])

  return null
}
