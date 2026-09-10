'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'

// Tiny interaction island. Editorial records and translations stay on server.
export function EditorialLink({ eventName, eventData, ...props }: ComponentProps<typeof Link> & {
  eventName: Parameters<typeof trackAnalyticsEvent>[0]
  eventData: Record<string, string>
}) {
  return <Link {...props} onClick={() => trackAnalyticsEvent(eventName, eventData)} />
}
