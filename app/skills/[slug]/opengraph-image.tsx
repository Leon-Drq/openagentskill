import { ImageResponse } from 'next/og'
import { getSkillBySlug, convertSkillRecordToManifest } from '@/lib/db/skills'

export const runtime = 'edge'
export const alt = 'OpenAgentSkill skill preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function formatStars(stars: number) {
  if (stars >= 1_000_000) return `${(stars / 1_000_000).toFixed(1)}M`
  if (stars >= 1000) return `${(stars / 1000).toFixed(1)}K`
  return String(stars)
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const record = await getSkillBySlug(slug)
  const skill = record ? convertSkillRecordToManifest(record) : null

  const name = skill?.name || 'OpenAgentSkill'
  const description = skill?.description || 'Discover practical skills for AI agents.'
  const category = skill?.category || 'agent-skill'
  const stars = formatStars(skill?.stats.stars || 0)
  const install = skill?.technical.installCommand || `npx skills add ${slug}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0f0f0f',
          color: '#f8f3e8',
          padding: '64px',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: 'radial-gradient(circle, rgba(248,243,232,0.14) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.28,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 64,
            right: 64,
            top: 44,
            height: 2,
            display: 'flex',
            background: 'rgba(248,243,232,0.22)',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: '2px solid rgba(248,243,232,0.8)',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              O
            </div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 700 }}>OpenAgentSkill</div>
          </div>
          <div
            style={{
              display: 'flex',
              border: '1px solid rgba(248,243,232,0.32)',
              padding: '10px 16px',
              fontSize: 20,
              color: 'rgba(248,243,232,0.78)',
              fontFamily: 'monospace',
            }}
          >
            {stars} STARS
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 950 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 76,
              lineHeight: 0.96,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            {truncate(name, 42)}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              lineHeight: 1.25,
              color: 'rgba(248,243,232,0.76)',
              maxWidth: 900,
            }}
          >
            {truncate(description, 126)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                color: 'rgba(248,243,232,0.62)',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              }}
            >
              {truncate(category, 28)}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                color: 'rgba(248,243,232,0.9)',
                fontFamily: 'monospace',
              }}
            >
              {truncate(install, 58)}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: 'rgba(248,243,232,0.55)',
              fontFamily: 'monospace',
            }}
          >
            openagentskill.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
