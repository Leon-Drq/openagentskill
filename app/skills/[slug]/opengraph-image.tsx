import { ImageResponse } from 'next/og'
import { convertSkillRecordToManifest, getSkillBySlug } from '@/lib/db/skills'
import { formatCompactNumber, getPlatformHints, getSkillQualityProfile } from '@/lib/quality'

export const runtime = 'edge'
export const alt = 'OpenAgentSkill skill preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function getScenario(category: string, tags: string[], description: string) {
  const text = [category, description, ...tags].join(' ').toLowerCase()

  if (/finance|quant|trading|market|stock|portfolio/.test(text)) {
    return 'Use it when your agent needs to analyze markets, research assets, or build quant workflows.'
  }

  if (/football|soccer|sports|world cup|match|statsbomb/.test(text)) {
    return 'Use it when your agent needs football analytics, match data, or tournament research.'
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

function getDecisionLabel(score: number) {
  if (score >= 85) return 'Recommended'
  if (score >= 70) return 'Strong shortlist'
  if (score >= 55) return 'Prototype first'
  return 'Review first'
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        borderTop: `1px solid ${border}`,
        padding: '15px 0',
      }}
    >
      <div style={{ display: 'flex', color: muted, fontSize: 16 }}>{label}</div>
      <div style={{ display: 'flex', color: ink, fontSize: 16, fontWeight: 760, textAlign: 'right' }}>{value}</div>
    </div>
  )
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let record = null
  try {
    record = await getSkillBySlug(slug)
  } catch {
    record = null
  }

  const skill = record ? convertSkillRecordToManifest(record) : null
  const name = skill?.name || titleCase(slug)
  const description = skill?.description || 'Discover practical skills for AI agents.'
  const category = titleCase(skill?.category || 'agent-skill')
  const stars = formatCompactNumber(skill?.stats.stars || 0)
  const quality = record ? getSkillQualityProfile(record) : null
  const score = quality?.score || skill?.stats.qualityScore || 0
  const decision = getDecisionLabel(score)
  const install = skill?.technical.installCommand || `npx skills add ${slug}`
  const platforms = record ? getPlatformHints(record).slice(0, 3) : []
  const platformText = platforms.length > 0 ? platforms.join(' + ') : 'Codex + Claude Code + Cursor'
  const scenario = getScenario(skill?.category || category, skill?.tags || [], description)
  const topTags = (skill?.tags || []).slice(0, 3).map(titleCase)

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
                {category.toUpperCase()} SKILL
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
                {truncate(name, 46)}
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
                {[decision, `${stars} stars`, ...topTags].slice(0, 5).map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      display: 'flex',
                      border: `1px solid ${index === 0 ? green : border}`,
                      backgroundColor: index === 0 ? green : card,
                      color: index === 0 ? '#ffffff' : ink,
                      borderRadius: 999,
                      padding: '10px 14px',
                      fontSize: 16,
                      fontWeight: 740,
                    }}
                  >
                    {item}
                  </div>
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
                  <div style={{ display: 'flex', color: ink, fontSize: 30, fontWeight: 800 }}>{decision}</div>
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
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 28, fontWeight: 820 }}>{score || '--'}</div>
                  <div style={{ display: 'flex', fontSize: 10, fontWeight: 760, letterSpacing: 1 }}>SCORE</div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 24,
                  border: `1px solid ${border}`,
                  borderRadius: 14,
                  backgroundColor: '#f1ede4',
                  padding: '14px 15px',
                  color: ink,
                  fontSize: 17,
                  lineHeight: 1.28,
                }}
              >
                {truncate(description, 112)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
                <SignalRow label="GitHub signal" value={`${stars} stars`} />
                <SignalRow label="Install path" value={install ? 'Ready' : 'Review'} />
                <SignalRow label="Works with" value={truncate(platformText, 28)} />
                <SignalRow label="Registry URL" value="openagentskill.com" />
              </div>
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
              fontSize: 16,
            }}
          >
            <div style={{ display: 'flex' }}>{truncate(install, 68)}</div>
            <div style={{ display: 'flex', color: green, fontWeight: 760 }}>Find the right skill automatically</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
