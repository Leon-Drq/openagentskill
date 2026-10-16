import { ImageResponse } from 'next/og'
import { getRankingDefinition } from '@/lib/rankings'
import { getRankingLanding } from '@/lib/ranking-landing-data'
import { createPublicClient } from '@/lib/supabase/public'
import { getXShortlist, isXShortlistLane } from '@/lib/x/shortlist'
import { RankingSocialCard } from '@/components/og/ranking'
import { CreatorSocialCard } from '@/components/og/creator'
import { ShortlistSocialCard } from '@/components/og/shortlist'
import { ShortlistSlide } from '@/components/og/shortlist-slides'
import { renderOgOrCached } from './response'
import { ogError, validOgIdentifier } from './cache'

const size = { width: 1200, height: 630 }
const slides = new Set(['cover', 'workflow', 'picks', 'trust'])

export async function rankingOgImage(slug: string) {
  const definition = getRankingDefinition(slug)
  if (!definition) return ogError()
  return renderOgOrCached('ranking', [slug], async () => {
    const list = await getRankingLanding(slug)
    if (list.source === 'unavailable') return ogError(503)
    return new ImageResponse(<RankingSocialCard definition={definition} list={list} />, size)
  })
}

export async function creatorOgImage(input: string) {
  if (!validOgIdentifier(input)) return ogError()
  const username = input.toLowerCase()
  return renderOgOrCached('creator', [username], async () => {
    const { data: profile, error } = await createPublicClient({ requestTimeoutMs: 5000 })
      .from('profiles').select('username,display_name,bio').eq('username', username).maybeSingle()
    if (error) return ogError(503)
    if (!profile) return ogError()
    return new ImageResponse(<CreatorSocialCard profile={profile} />, size)
  })
}

export async function shortlistOgImage(lane: string, slide?: string) {
  if (!isXShortlistLane(lane) || (slide !== undefined && !slides.has(slide))) return ogError()
  return renderOgOrCached('shortlist', [lane, slide || 'main'], async () => {
    const shortlist = await getXShortlist(lane)
    if (shortlist.picks.length < 3) return ogError()
    const card = slide ? <ShortlistSlide shortlist={shortlist} slide={slide} /> : <ShortlistSocialCard shortlist={shortlist} />
    return new ImageResponse(card, size)
  })
}
