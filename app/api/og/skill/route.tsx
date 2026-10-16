import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { SkillSocialCard } from '@/components/skill-social-card'
import { renderOgOrCached } from '@/lib/og/response'

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
  const numeric = (key: string, max: number) => {
    const value = Number(params.get(key) || '0')
    return Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0
  }
  const stars = numeric('stars', Number.MAX_SAFE_INTEGER)
  const score = numeric('score', 100)
  const safety = truncate(params.get('safety') || 'Review first', 24)
  const starLabel = stars > 0 ? `${compactNumber(stars)} stars` : 'Open registry'

  const scenario = truncate(description, 82)
  // Legacy free-form images remain compatible, but cannot grow durable storage.
  return renderOgOrCached('preview', [name, slug, scenario, score, safety, starLabel], () => new ImageResponse(
    <SkillSocialCard
      name={name}
      slug={slug}
      scenario={scenario}
      score={score}
      safety={safety}
      stars={starLabel}
      install="Ready from openagentskill.com"
      statusLabel="REGISTRY PREVIEW"
      statusDetail="OpenAgentSkill share asset"
      statusTone="community"
      creator="openagentskill"
      repository="openagentskill.com"
    />,
    size
  ), false)
}
