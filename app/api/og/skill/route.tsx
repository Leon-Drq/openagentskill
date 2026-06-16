import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const size = {
  width: 1200,
  height: 630,
}

const ink = '#171410'
const muted = '#6f6a60'
const border = '#ded8cc'
const paper = '#f7f4ed'
const card = '#fffdf8'
const green = '#006b4f'
const gold = '#d7a13b'

function BrandMark({ size = 40, color = ink }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" style={{ display: 'flex' }}>
      <path
        fill={color}
        d="M58.5 12.5C35.1 15.4 17.5 40.8 17.5 64c0 23.2 17.6 48.6 41 51.5C43.2 114.3 35.5 91.7 35.5 64S43.2 13.7 58.5 12.5Z"
      />
      <path
        fill={color}
        d="M69.5 12.5c23.4 2.9 41 28.3 41 51.5 0 23.2-17.6 48.6-41 51.5C84.8 114.3 92.5 91.7 92.5 64S84.8 13.7 69.5 12.5Z"
      />
    </svg>
  )
}

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
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

function getScenario(category: string, tags: string[], description: string) {
  const text = [category, description, ...tags].join(' ').toLowerCase()

  if (/research|deep[-_\s]?research|recency|trends?|social[-_\s]?media|reddit|youtube|hackernews|polymarket|web[-_\s]?search|twitter|\bx\b/.test(text)) {
    return 'Use it when your agent needs recent cross-source research, trend signals, or a grounded brief.'
  }

  if (/football|soccer|sports|world cup|match|statsbomb/.test(text)) {
    return 'Use it when your agent needs football analytics, match data, or tournament research.'
  }

  if (/finance|quant|trading|financial[-_\s]?market|stock|portfolio/.test(text)) {
    return 'Use it when your agent needs to analyze markets, research assets, or build quant workflows.'
  }

  if (/scrap|crawl|browser|web|playwright|puppeteer/.test(text)) {
    return 'Use it when your agent needs clean web data instead of brittle one-off scraping code.'
  }

  if (/code|developer|github|review|test|lint|repo/.test(text)) {
    return 'Use it when your coding agent needs a reusable capability for real engineering work.'
  }

  if (/rag|search|retrieval|document|pdf|knowledge/.test(text)) {
    return 'Use it when your agent needs to parse, retrieve, and reason over knowledge sources.'
  }

  return 'Use it when your agent needs a practical capability it can plug into a real workflow.'
}

function Pill({ children, active = false }: { children: string; active?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        border: `1px solid ${active ? green : border}`,
        backgroundColor: active ? green : card,
        color: active ? '#ffffff' : ink,
        borderRadius: 999,
        padding: '10px 14px',
        fontSize: 16,
        fontWeight: 740,
      }}
    >
      {children}
    </div>
  )
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const name = truncate(params.get('name') || 'AI Agent Skill', 46)
  const category = params.get('category') || 'agent-skill'
  const description = params.get('description') || 'Discover practical skills for AI agents.'
  const stars = Number(params.get('stars') || '0')
  const tags = (params.get('tags') || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3)
  const install = truncate(params.get('install') || 'npx skills add', 64)
  const scenario = getScenario(category, tags, description)
  const categoryLabel = titleCase(category)
  const starLabel = stars > 0 ? `${compactNumber(stars)} stars` : 'Open registry'
  const visibleTags = tags.length > 0 ? tags.map(titleCase) : ['Agent Skill', 'Open Registry']

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: paper,
          color: ink,
          fontFamily: 'Inter, Arial, sans-serif',
          padding: '52px 64px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: 'radial-gradient(circle, rgba(23,20,16,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.3,
          }}
        />

        <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BrandMark size={42} />
              <div style={{ display: 'flex', fontSize: 23, fontWeight: 780 }}>OpenAgentSkill</div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: `1px solid ${border}`,
                borderRadius: 999,
                backgroundColor: card,
                padding: '9px 13px',
                color: green,
                fontSize: 13,
                fontWeight: 780,
                letterSpacing: 1.4,
              }}
            >
              REGISTRY DECISION
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 50 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 655 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: muted,
                  fontSize: 15,
                  fontWeight: 740,
                  letterSpacing: 4,
                }}
              >
                <span style={{ display: 'flex', color: gold }}>-</span>
                {categoryLabel.toUpperCase()} SKILL
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 26,
                  fontSize: name.length > 24 ? 58 : 68,
                  lineHeight: 0.98,
                  fontWeight: 800,
                  color: ink,
                  wordBreak: 'break-word',
                }}
              >
                {name}
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 24,
                  fontSize: 25,
                  lineHeight: 1.28,
                  color: '#4f4940',
                  maxWidth: 610,
                }}
              >
                {truncate(scenario, 142)}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
                <Pill active>Recommended</Pill>
                <Pill>{starLabel}</Pill>
                {visibleTags.slice(0, 3).map((tag) => (
                  <Pill key={tag}>{tag}</Pill>
                ))}
              </div>
            </div>

            <div
              style={{
                width: 385,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: card,
                border: `1px solid ${border}`,
                borderRadius: 22,
                padding: '28px 28px 18px',
                boxShadow: '0 22px 60px rgba(23,20,16,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', color: muted, fontSize: 14, fontWeight: 730 }}>Recommendation</div>
                  <div style={{ display: 'flex', color: ink, fontSize: 30, fontWeight: 800 }}>Recommended</div>
                </div>
                <div
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: 999,
                    backgroundColor: green,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 29, fontWeight: 760 }}>100</div>
                  <div style={{ display: 'flex', fontSize: 10, letterSpacing: 1.4 }}>SCORE</div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 22,
                  border: `1px solid ${border}`,
                  backgroundColor: '#f1ede4',
                  borderRadius: 12,
                  padding: '14px 16px',
                  color: ink,
                  fontSize: 18,
                  lineHeight: 1.28,
                }}
              >
                {truncate(description, 112)}
              </div>

              {[
                ['GitHub signal', starLabel],
                ['Install path', 'Ready'],
                ['Works with', 'Codex + Claude Code'],
                ['Registry URL', 'openagentskill.com'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    borderTop: `1px solid ${border}`,
                    padding: '15px 0',
                  }}
                >
                  <div style={{ display: 'flex', color: muted, fontSize: 16 }}>{label}</div>
                  <div style={{ display: 'flex', color: ink, fontSize: 16, fontWeight: 760, textAlign: 'right' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              height: 54,
              borderTop: `1px solid ${border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: muted,
              fontSize: 15,
            }}
          >
            <div style={{ display: 'flex' }}>{install}</div>
            <div style={{ display: 'flex', color: green, fontWeight: 760 }}>Find the right skill automatically</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}
