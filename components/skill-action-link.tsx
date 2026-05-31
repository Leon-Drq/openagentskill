'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { trackSkillEvent, type SkillEventType } from '@/components/skill-event-tracker'

interface SkillActionLinkProps {
  href: string
  skillSlug: string
  eventType: SkillEventType
  children: ReactNode
  className?: string
  external?: boolean
  metadata?: Record<string, unknown>
}

export function SkillActionLink({
  href,
  skillSlug,
  eventType,
  children,
  className,
  external,
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
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackSkillEvent(skillSlug, eventType, metadata)}
    >
      {children}
    </a>
  )
}
