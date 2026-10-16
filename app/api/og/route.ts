import { skillOgImage } from '@/lib/og/skill'
import { creatorOgImage, rankingOgImage, shortlistOgImage } from '@/lib/og/renderers'
import { ogError } from '@/lib/og/cache'

export const runtime = 'nodejs'

/** A controlled gateway; names, scores and artwork always come from public site data. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  switch (params.get('kind')) {
    case 'skill': return skillOgImage(params.get('slug') || '')
    case 'ranking': return rankingOgImage(params.get('slug') || '')
    case 'creator': return creatorOgImage(params.get('username') || '')
    case 'shortlist': return shortlistOgImage(params.get('lane') || '', params.get('slide') ?? undefined)
    default: return ogError()
  }
}
