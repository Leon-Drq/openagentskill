import { ImageResponse } from 'next/og'

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

function BrandMark({ size = 58, color = ink }: { size?: number; color?: string }) {
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

function Pill({ children, active = false }: { children: string; active?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: `1px solid ${active ? green : border}`,
        backgroundColor: active ? green : card,
        color: active ? '#ffffff' : ink,
        borderRadius: 999,
        padding: '12px 18px',
        fontSize: 18,
        fontWeight: 720,
      }}
    >
      {children}
    </div>
  )
}

export async function GET() {
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
            backgroundImage: 'radial-gradient(circle, rgba(23,20,16,0.14) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.34,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '34px 34px',
            display: 'flex',
            border: `1px solid ${border}`,
            borderRadius: 28,
          }}
        />

        <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <BrandMark size={48} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 780 }}>OpenAgentSkill</div>
                <div style={{ display: 'flex', color: muted, fontSize: 14, letterSpacing: 2.4 }}>
                  REGISTRY API FOR AGENTS
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: `1px solid ${border}`,
                borderRadius: 999,
                backgroundColor: card,
                padding: '10px 14px',
                color: muted,
                fontSize: 16,
                fontWeight: 650,
              }}
            >
              <span style={{ display: 'flex', width: 9, height: 9, borderRadius: 999, backgroundColor: green }} />
              openagentskill.com
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 48 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 675 }}>
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
                  marginTop: 26,
                  fontSize: 74,
                  lineHeight: 0.96,
                  fontWeight: 790,
                  color: ink,
                  letterSpacing: -1.6,
                }}
              >
                The skill layer for AI agents.
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 26,
                  maxWidth: 650,
                  fontSize: 28,
                  lineHeight: 1.26,
                  color: '#4f4940',
                }}
              >
                Let your AI agent find, compare, and install the right reusable skill automatically.
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 34 }}>
                <Pill active>Discover</Pill>
                <Pill>Compare</Pill>
                <Pill>Install</Pill>
              </div>
            </div>

            <div
              style={{
                width: 330,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: card,
                border: `1px solid ${border}`,
                borderRadius: 24,
                padding: 24,
                boxShadow: '0 22px 60px rgba(23,20,16,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', color: muted, fontSize: 14, fontWeight: 760, letterSpacing: 2 }}>
                  AGENT REQUEST
                </div>
                <div style={{ display: 'flex', color: green, fontSize: 13, fontWeight: 780 }}>LIVE</div>
              </div>

              <div
                style={{
                  display: 'flex',
                  marginTop: 18,
                  border: `1px solid ${border}`,
                  backgroundColor: '#f1ede4',
                  borderRadius: 16,
                  padding: '16px 18px',
                  color: ink,
                  fontSize: 22,
                  lineHeight: 1.24,
                }}
              >
                Find a trustworthy skill for a real workflow.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
                {[
                  ['01', 'Rank by task fit'],
                  ['02', 'Check trust signals'],
                  ['03', 'Return install plan'],
                ].map(([index, label]) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      borderTop: `1px solid ${border}`,
                      padding: '14px 0',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        backgroundColor: index === '01' ? green : '#eee8dc',
                        color: index === '01' ? '#ffffff' : ink,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 760,
                      }}
                    >
                      {index}
                    </div>
                    <div style={{ display: 'flex', color: ink, fontSize: 18, fontWeight: 720 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              height: 52,
              borderTop: `1px solid ${border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: muted,
              fontSize: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 24 }}>
              <span style={{ display: 'flex' }}>npm for AI Agent Skills</span>
              <span style={{ display: 'flex' }}>Agent-ready APIs</span>
              <span style={{ display: 'flex' }}>Open registry</span>
            </div>
            <div style={{ display: 'flex', color: green, fontWeight: 760 }}>openagentskill.com</div>
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
