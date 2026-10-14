'use client'

import type { ReactNode } from 'react'
import { trackSkillEvent, type SkillEventType } from '@/components/skill-event-tracker'
import { SkillDetailLink as Link } from '@/components/skill-detail-link'

interface SkillActionLinkProps {
  href: string
  skillSlug: string
  eventType: SkillEventType
  children: ReactNode
  className?: string
  external?: boolean
  rel?: string
  metadata?: Record<string, unknown>
}

export function SkillActionLink({
  href,
  skillSlug,
  eventType,
  children,
  className,
  external,
  rel,
  metadata,
}: SkillActionLinkProps) {
  if (!external) {
    return (
      <Link
        href={href}
        className={className}
        onClick={() => trackSkillEvent(skillSlug, eventType, metadata)}
      >
        {children}
      </Link>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel={rel || 'noopener noreferrer'}
      className={className}
      onClick={() => trackSkillEvent(skillSlug, eventType, metadata)}
      onAuxClick={event => { if (event.button === 1) void trackSkillEvent(skillSlug, eventType, metadata) }}
    >
      {children}
    </a>
  )
}
