import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { SkillSocialCard } from '@/components/skill-social-card'

export const runtime = 'nodejs'

const size = {
  width: 1200,
  height: 630,
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(value)
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const name = truncate(params.get('name') || 'AI Agent Skill', 46)
  const slug = (params.get('slug') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent-skill').slice(0, 60)
  const description = params.get('description') || 'Discover practical skills for AI agents.'
  const stars = Number(params.get('stars') || '0')
  const score = Number(params.get('score') || '0')
  const safety = truncate(params.get('safety') || 'Review first', 24)
  const starLabel = stars > 0 ? `${compactNumber(stars)} stars` : 'Open registry'

  return new ImageResponse(
    <SkillSocialCard
      name={name}
      slug={slug}
      scenario={truncate(description, 82)}
      score={score}
      safety={safety}
      stars={starLabel}
      install="Ready from openagentskill.com"
    />,
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}
