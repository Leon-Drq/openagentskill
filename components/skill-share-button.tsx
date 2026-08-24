'use client'

import { Check, Share2 } from 'lucide-react'
import { useState } from 'react'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { SkillDetailValue } from '@/components/skill-detail-text'

export function SkillShareButton({
  skillSlug,
  skillName,
  className = '',
}: {
  skillSlug: string
  skillName: string
  className?: string
}) {
  const [shared, setShared] = useState(false)

  async function shareSkill() {
    const url = `${window.location.origin}/skills/${skillSlug}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${skillName} on OpenAgentSkill`,
          text: `Review the trust signals and install ${skillName} for your AI agent.`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
      }

      trackSkillEvent(skillSlug, 'share_copy', { placement: 'skill_hero' })
      setShared(true)
      window.setTimeout(() => setShared(false), 1_800)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Failed to share skill:', error)
    }
  }

  return (
    <button
      type="button"
      onClick={shareSkill}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-border bg-background px-3 text-sm font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground ${className}`}
    >
      {shared ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      <SkillDetailValue value={shared ? 'Link copied' : 'Share'} />
    </button>
  )
}
