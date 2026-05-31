'use client'

import { useEffect } from 'react'

export type SkillEventType =
  | 'view'
  | 'install_copy'
  | 'save'
  | 'compare'
  | 'outbound_github'
  | 'outbound_docs'
  | 'claim_start'
  | 'claim_submit'

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
