import { ImageResponse } from 'next/og'
import { getXShortlist, isXShortlistLane } from '@/lib/x/shortlist'

export const runtime = 'edge'
export const alt = 'OpenAgentSkill task shortlist'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ink = '#171410'
const muted = '#6f6a60'
const border = '#ded8cc'
const paper = '#f7f4ed'
const card = '#fffdf8'
const green = '#006b4f'
const gold = '#d7a13b'

function BrandMark() {
  return (
    <svg width="38" height="38" viewBox="0 0 128 128" style={{ display: 'flex' }}>
      <path fill={ink} d="M58.5 12.5C35.1 15.4 17.5 40.8 17.5 64c0 23.2 17.6 48.6 41 51.5C43.2 114.3 35.5 91.7 35.5 64S43.2 13.7 58.5 12.5Z" />
      <path fill={ink} d="M69.5 12.5c23.4 2.9 41 28.3 41 51.5 0 23.2-17.6 48.6-41 51.5C84.8 114.3 92.5 91.7 92.5 64S84.8 13.7 69.5 12.5Z" />
    </svg>
  )
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

export default async function Image({
  params,
}: {
  params: Promise<{ lane: string }>
}) {
  const { lane } = await params
  if (!isXShortlistLane(lane)) return new Response('Not Found', { status: 404 })

  const shortlist = await getXShortlist(lane).catch(() => null)
  if (!shortlist || shortlist.picks.length < 3) return new Response('Not Found', { status: 404 })

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
          fontFamily: 'Arial, sans-serif',
          padding: '46px 58px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: 'radial-gradient(circle, rgba(23,20,16,0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            opacity: 0.24,
          }}
        />
        <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BrandMark />
              <span style={{ display: 'flex', fontSize: 22, fontWeight: 750 }}>OpenAgentSkill</span>
            </div>
            <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: 999, padding: '9px 14px', backgroundColor: card, color: green, fontSize: 12, fontWeight: 750, letterSpacing: 1.6 }}>
              TASK SHORTLIST
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, gap: 44, paddingTop: 42 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 465 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: muted, fontSize: 14, fontWeight: 750, letterSpacing: 3.6 }}>
                <span style={{ display: 'flex', color: gold }}>.</span>
                {shortlist.config.eyebrow.toUpperCase()}
              </div>
              <div style={{ display: 'flex', marginTop: 22, fontFamily: 'Georgia, serif', fontSize: 57, lineHeight: 0.98, fontWeight: 700, letterSpacing: -1.5 }}>
                {truncate(shortlist.config.title, 82)}
              </div>
              <div style={{ display: 'flex', marginTop: 24, color: muted, fontSize: 21, lineHeight: 1.32, maxWidth: 450 }}>
                Chosen for a real workflow, with a public audit and an install path for every pick.
              </div>
              <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'center', gap: 10, color: green, fontSize: 17, fontWeight: 760 }}>
                <span style={{ display: 'flex' }}>Find the right skill automatically</span>
                <span style={{ display: 'flex' }}>-&gt;</span>
              </div>
            </div>

            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', border: `1px solid ${border}`, backgroundColor: card, padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12 }}>
                <span style={{ display: 'flex', color: muted, fontSize: 12, fontWeight: 760, letterSpacing: 2.4 }}>WHAT TO ADD NEXT</span>
                <span style={{ display: 'flex', color: green, fontSize: 15, fontWeight: 760 }}>{shortlist.picks.length} PICKS</span>
              </div>
              {shortlist.picks.slice(0, 5).map((pick, index) => (
                <div key={pick.skill.slug} style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: `1px solid ${border}`, padding: '15px 0' }}>
                  <div style={{ display: 'flex', width: 31, height: 31, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: index === 0 ? green : '#eee8dc', color: index === 0 ? '#fff' : ink, fontSize: 13, fontWeight: 760 }}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ display: 'flex', color: green, fontSize: 11, fontWeight: 760, letterSpacing: 1.8 }}>{pick.role.toUpperCase()}</span>
                    <span style={{ display: 'flex', marginTop: 4, fontSize: 20, fontWeight: 740 }}>{truncate(pick.skill.name, 38)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
