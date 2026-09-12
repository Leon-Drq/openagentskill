'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { getShowcaseCreator, getShowcaseCreatorHref } from '@/lib/showcase-shared'

export function ShowcaseCreatorCredit({ creatorId, label }: { creatorId: string; label: string }) {
  const { locale } = useI18n()
  const creator = getShowcaseCreator(creatorId)
  const href = getShowcaseCreatorHref(creator)
  const external = !href.startsWith('/')
  return (
    <Link href={external ? href : getLocalizedNavigationHref(href, locale)} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
      onClick={() => trackAnalyticsEvent('showcase_creator_open', { creator_id: creator.id, role: label })}
      aria-label={`${label}: ${creator.name}`}
      className="group/creator inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-md outline-offset-4 hover:text-[#006b4f] focus-visible:outline-2 focus-visible:outline-[#006b4f]">
      {creator.githubUsername ? <GitHubOwnerAvatar owner={creator.githubUsername} size="sm" linked={false} /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#e4e0d8] bg-[#fbfaf6]"><BrandMark className="h-5 w-5" /></span>}
      <span className="min-w-0">
        <span className="block text-[10px] leading-4 text-[#6d675e]">{label}</span>
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium leading-5"><span className="truncate">{creator.name}</span><ArrowUpRight className="h-3 w-3 shrink-0 text-[#6d675e]" aria-hidden="true" /></span>
      </span>
    </Link>
  )
}
