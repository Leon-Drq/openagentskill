'use client'

import { useEffect } from 'react'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { getDirectXAttribution, persistXAttribution } from '@/lib/x/attribution-client'

export function XAttributionTracker({
  anchorSkillSlug,
  lane,
}: {
  anchorSkillSlug: string
  lane: string
}) {
  useEffect(() => {
    const attribution = getDirectXAttribution()
    if (!attribution) return

    persistXAttribution(attribution)
    trackSkillEvent(anchorSkillSlug, 'view', {
      placement: 'x_shortlist_landing',
      shortlist_lane: lane,
      attribution,
    })
  }, [anchorSkillSlug, lane])

  return null
}
