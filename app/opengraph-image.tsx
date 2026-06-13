import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'OpenAgentSkill - The skill layer for AI agents'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ink = '#171410'
const muted = '#6f6a60'
const border = '#ded8cc'
const paper = '#f7f4ed'
const card = '#fffdf8'
const green = '#006b4f'
const gold = '#d7a13b'

function BrandMark({ size = 46, color = ink }: { size?: number; color?: string }) {
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

function FlowStep({ index, label, detail }: { index: string; label: string; detail: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        borderTop: `1px solid ${border}`,
        padding: '12px 0',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          backgroundColor: index === '01' ? green : '#eee8dc',
          color: index === '01' ? '#ffffff' : ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {index}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', color: ink, fontSize: 20, fontWeight: 760 }}>{label}</div>
        <div style={{ display: 'flex', color: muted, fontSize: 14, lineHeight: 1.2 }}>{detail}</div>
      </div>
    </div>
  )
}

export default async function Image() {
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
          padding: '54px 68px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: 'radial-gradient(circle, rgba(23,20,16,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.32,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 68,
            right: 68,
            top: 88,
            height: 1,
            display: 'flex',
            backgroundColor: border,
          }}
        />

        <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: green, display: 'flex' }} />
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 760 }}>OpenAgentSkill</div>
              <div
                style={{
                  display: 'flex',
                  border: `1px solid ${border}`,
                  borderRadius: 999,
                  padding: '7px 12px',
                  color: muted,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                }}
              >
                REGISTRY API
              </div>
            </div>
            <div style={{ display: 'flex', color: muted, fontSize: 18 }}>openagentskill.com</div>
          </div>

          <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 56 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 620, paddingTop: 18 }}>
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
                SKILL LAYER - AGENT DISCOVERY
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 28,
                  fontSize: 72,
                  lineHeight: 0.96,
                  fontWeight: 780,
                  color: ink,
                }}
              >
                The skill layer for AI agents
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 28,
                  maxWidth: 565,
                  fontSize: 27,
                  lineHeight: 1.28,
                  color: '#4f4940',
                }}
              >
                Let your AI agent find, compare, and install the right reusable skill automatically.
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                {['Discover', 'Compare', 'Install'].map((item, index) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      border: `1px solid ${index === 0 ? green : border}`,
                      backgroundColor: index === 0 ? green : card,
                      color: index === 0 ? '#ffffff' : ink,
                      borderRadius: 10,
                      padding: '12px 16px',
                      fontSize: 17,
                      fontWeight: 730,
                    }}
                  >
                    {index === 0 ? '->' : '+'} {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                width: 390,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: card,
                border: `1px solid ${border}`,
                borderRadius: 22,
                padding: '24px 24px 8px',
                boxShadow: '0 22px 60px rgba(23,20,16,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <BrandMark size={38} color={ink} />
                <div
                  style={{
                    display: 'flex',
                    border: `1px solid ${border}`,
                    borderRadius: 999,
                    padding: '8px 11px',
                    color: green,
                    fontSize: 12,
                    fontWeight: 780,
                    letterSpacing: 1.4,
                  }}
                >
                  LIVE INDEX
                </div>
              </div>

              <div style={{ display: 'flex', marginTop: 22, flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', color: muted, fontSize: 15, fontWeight: 700 }}>Agent request</div>
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#f1ede4',
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    color: ink,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  Find a trustworthy skill for scraping vendor pricing pages.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
                <FlowStep index="01" label="Rank skills" detail="Quality, stars, freshness, install path" />
                <FlowStep index="02" label="Audit risk" detail="Review trust, license, maintenance signals" />
                <FlowStep index="03" label="Return handoff" detail="Codex, Claude Code, Cursor" />
              </div>
            </div>
          </div>

          <div
            style={{
              height: 58,
              borderTop: `1px solid ${border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: muted,
              fontSize: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 28 }}>
              <span style={{ display: 'flex' }}>npm for AI Agent Skills</span>
              <span style={{ display: 'flex' }}>Agent-ready APIs</span>
              <span style={{ display: 'flex' }}>Open source registry</span>
            </div>
            <div style={{ display: 'flex', color: green, fontWeight: 760 }}>AI agent skills registry</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
