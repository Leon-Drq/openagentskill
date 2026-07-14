'use client'

import { useEffect } from 'react'
import { trackAnalyticsEvent, type AnalyticsEventName, type AnalyticsParameterValue } from '@/lib/analytics'

export type SkillEventType =
  | 'view'
  | 'install_copy'
  | 'save'
  | 'compare'
  | 'outbound_github'
  | 'outbound_docs'
  | 'claim_start'
  | 'claim_submit'

const analyticsEventNames: Record<SkillEventType, AnalyticsEventName> = {
  view: 'skill_view',
  install_copy: 'skill_install_copy',
  save: 'skill_save',
  compare: 'skill_compare',
  outbound_github: 'skill_outbound_github',
  outbound_docs: 'skill_outbound_docs',
  claim_start: 'skill_claim_start',
  claim_submit: 'skill_claim_submit',
}

const analyticsMetadataKeys = new Set(['target', 'kind', 'placement', 'source', 'platform'])

function analyticsMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, AnalyticsParameterValue] =>
        analyticsMetadataKeys.has(entry[0]) &&
        (typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean')
    )
  )
}

function getSessionId() {
  const key = 'openagentskill.sessionId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

export async function trackSkillEvent(
  skillSlug: string,
  eventType: SkillEventType,
  metadata: Record<string, unknown> = {}
) {
  if (typeof window === 'undefined') return

  trackAnalyticsEvent(analyticsEventNames[eventType], {
    skill_slug: skillSlug,
    path: window.location.pathname,
    ...analyticsMetadata(metadata),
  })

  try {
    await fetch('/api/events/skill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_slug: skillSlug,
        event_type: eventType,
        session_id: getSessionId(),
        path: window.location.pathname,
        referrer: document.referrer || null,
        metadata,
      }),
      keepalive: true,
    })
  } catch {
    // Engagement analytics should never block the product flow.
  }
}

export function SkillEventTracker({
  skillSlug,
  eventType = 'view',
  metadata,
}: {
  skillSlug: string
  eventType?: SkillEventType
  metadata?: Record<string, unknown>
}) {
  useEffect(() => {
    trackSkillEvent(skillSlug, eventType, metadata)
  }, [skillSlug, eventType, metadata])

  return null
}
