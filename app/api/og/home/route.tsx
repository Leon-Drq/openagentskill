import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

const size = { width: 1200, height: 630 }

const ink = '#171713'
const muted = '#6D6A61'
const border = '#D8D4C9'
const paper = '#F7F5EF'
const card = '#FFFEFA'
const green = '#006B4F'
const greenSoft = '#E5F0EB'
const gold = '#C38B24'

function BrandMark({ color = ink }: { color?: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 128 128" style={{ display: 'flex' }}>
      <path fill={color} d="M58.5 12.5C35.1 15.4 17.5 40.8 17.5 64c0 23.2 17.6 48.6 41 51.5C43.2 114.3 35.5 91.7 35.5 64S43.2 13.7 58.5 12.5Z" />
      <path fill={color} d="M69.5 12.5c23.4 2.9 41 28.3 41 51.5 0 23.2-17.6 48.6-41 51.5C84.8 114.3 92.5 91.7 92.5 64S84.8 13.7 69.5 12.5Z" />
    </svg>
  )
}

function Stage({ index, label, detail, active = false }: { index: string; label: string; detail: string; active?: boolean }) {
  return (
    <div style={{ width: 244, display: 'flex', alignItems: 'center', gap: 13 }}>
      <div
        style={{
          width: 34,
          height: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 99,
          backgroundColor: active ? green : '#ECE9E1',
          color: active ? '#FFFFFF' : ink,
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {index}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', color: active ? green : ink, fontSize: 14, fontWeight: 800 }}>{label}</div>
        <div style={{ display: 'flex', color: muted, fontFamily: 'monospace', fontSize: 10 }}>{detail}</div>
      </div>
    </div>
  )
}

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: paper,
        color: ink,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          backgroundImage: 'linear-gradient(rgba(23,23,19,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(23,23,19,0.045) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.65,
        }}
      />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, display: 'flex', backgroundColor: green }} />

      <div style={{ position: 'absolute', left: 54, right: 54, top: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandMark />
          <div style={{ display: 'flex', fontSize: 25, fontWeight: 800, letterSpacing: -0.7 }}>OpenAgentSkill</div>
          <div style={{ display: 'flex', marginLeft: 8, borderLeft: `1px solid ${border}`, paddingLeft: 18, color: muted, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 1.8 }}>
            OPEN AGENT SKILL REGISTRY
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, borderRadius: 99, backgroundColor: greenSoft, color: green, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 800 }}>
          <span style={{ display: 'flex', width: 7, height: 7, borderRadius: 99, backgroundColor: green }} />
          API + CLI · OPEN SOURCE
        </div>
      </div>
      <div style={{ position: 'absolute', left: 54, right: 54, top: 92, height: 1, display: 'flex', backgroundColor: border }} />

      <div style={{ position: 'absolute', left: 54, right: 54, top: 126, height: 340, display: 'flex', justifyContent: 'space-between', gap: 54 }}>
        <div style={{ width: 665, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: muted, fontFamily: 'monospace', fontSize: 12, fontWeight: 800, letterSpacing: 2.1 }}>
            <span style={{ display: 'flex', width: 8, height: 8, borderRadius: 99, backgroundColor: gold }} />
            DISCOVERY WITH PROVENANCE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20, fontFamily: 'Georgia, serif', fontSize: 61, fontWeight: 700, lineHeight: 0.98, letterSpacing: -2.2 }}>
            <div style={{ display: 'flex' }}>Find the skill.</div>
            <div style={{ display: 'flex' }}>Verify the source.</div>
            <div style={{ display: 'flex', color: green }}>Prove the outcome.</div>
          </div>
          <div style={{ display: 'flex', marginTop: 23, maxWidth: 625, color: '#49463F', fontSize: 21, lineHeight: 1.4 }}>
            The open registry where AI agents discover, compare, install, and report real-world Skill results.
          </div>
        </div>

        <div style={{ width: 390, height: 320, display: 'flex', flexDirection: 'column', border: `1px solid ${border}`, backgroundColor: card, boxShadow: '0 24px 70px rgba(23,23,19,0.09)' }}>
          <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: `1px solid ${border}` }}>
            <div style={{ display: 'flex', color: muted, fontFamily: 'monospace', fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>AGENT RESOLVE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: green, fontFamily: 'monospace', fontSize: 10, fontWeight: 800 }}>
              <span style={{ display: 'flex', width: 6, height: 6, borderRadius: 99, backgroundColor: green }} /> LIVE
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: 18 }}>
            <div style={{ display: 'flex', color: muted, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.3 }}>TASK</div>
            <div style={{ display: 'flex', marginTop: 8, border: `1px solid ${border}`, backgroundColor: '#F1EEE6', padding: '13px 14px', color: ink, fontSize: 17, fontWeight: 700 }}>
              Review a pull request safely
            </div>
            <div style={{ display: 'flex', marginTop: 16, color: muted, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.3 }}>SHORTLIST</div>
            <div style={{ display: 'flex', marginTop: 8, flexDirection: 'column', border: `1px solid ${green}`, backgroundColor: greenSoft }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderBottom: '1px solid #C8DDD4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 99, backgroundColor: green, color: '#FFFFFF', fontFamily: 'monospace', fontSize: 10 }}>01</span>
                  <span style={{ display: 'flex', color: ink, fontSize: 16, fontWeight: 800 }}>Best task-fit Skill</span>
                </div>
                <span style={{ display: 'flex', color: green, fontFamily: 'monospace', fontSize: 11, fontWeight: 800 }}>92 / 100</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', color: muted, fontFamily: 'monospace', fontSize: 11 }}>
                <span style={{ display: 'flex' }}>+ 4 transparent alternatives</span>
                <span style={{ display: 'flex', color: green }}>INSTALL →</span>
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: 14, alignItems: 'center', justifyContent: 'space-between', color: muted, fontFamily: 'monospace', fontSize: 10 }}>
              <span style={{ display: 'flex' }}>SOURCE CHECKED</span>
              <span style={{ display: 'flex' }}>OUTCOME RECEIPT</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 54, right: 54, bottom: 34, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, backgroundColor: 'rgba(255,254,250,0.75)', padding: '0 20px' }}>
        <Stage index="01" label="Discover" detail="task-fit search" active />
        <div style={{ display: 'flex', color: border }}>→</div>
        <Stage index="02" label="Verify" detail="source + safety" />
        <div style={{ display: 'flex', color: border }}>→</div>
        <Stage index="03" label="Install" detail="agent-ready handoff" />
        <div style={{ display: 'flex', color: border }}>→</div>
        <Stage index="04" label="Prove" detail="verified outcomes" />
      </div>
    </div>,
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
