import { ImageResponse } from 'next/og'
import type { ReactNode } from 'react'
import { getXShortlist, isXShortlistLane, type XShortlist } from '@/lib/x/shortlist'

export const runtime = 'edge'
export const alt = 'OpenAgentSkill task shortlist share asset'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ink = '#171410'
const muted = '#6f6a60'
const border = '#ded8cc'
const paper = '#f7f4ed'
const card = '#fffdf8'
const green = '#006b4f'
const gold = '#d7a13b'
const slides = new Set(['cover', 'workflow', 'picks', 'trust'])

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="35" height="35" viewBox="0 0 128 128" style={{ display: 'flex' }}>
        <path fill={ink} d="M58.5 12.5C35.1 15.4 17.5 40.8 17.5 64c0 23.2 17.6 48.6 41 51.5C43.2 114.3 35.5 91.7 35.5 64S43.2 13.7 58.5 12.5Z" />
        <path fill={ink} d="M69.5 12.5c23.4 2.9 41 28.3 41 51.5 0 23.2-17.6 48.6-41 51.5C84.8 114.3 92.5 91.7 92.5 64S84.8 13.7 69.5 12.5Z" />
      </svg>
      <span style={{ display: 'flex', fontSize: 21, fontWeight: 760 }}>OpenAgentSkill</span>
    </div>
  )
}

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
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
          backgroundImage: 'radial-gradient(circle, rgba(23,20,16,0.16) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.22,
        }}
      />
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Brand />
          <div style={{ display: 'flex', border: `1px solid ${border}`, padding: '9px 14px', backgroundColor: card, color: green, fontSize: 11, fontWeight: 760, letterSpacing: 1.8 }}>
            {label}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function CoverSlide({ shortlist }: { shortlist: XShortlist }) {
  return (
    <Frame label="TASK SHORTLIST">
      <div style={{ display: 'flex', flex: 1, gap: 42, paddingTop: 44 }}>
        <div style={{ display: 'flex', width: 520, flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: muted, fontSize: 13, fontWeight: 760, letterSpacing: 3.2 }}>
            <span style={{ display: 'flex', color: gold }}>.</span>
            {shortlist.config.eyebrow.toUpperCase()}
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontFamily: 'Georgia, serif', fontSize: 56, lineHeight: 0.98, fontWeight: 700, letterSpacing: -1.4 }}>
            {truncate(shortlist.config.title, 84)}
          </div>
          <div style={{ display: 'flex', marginTop: 24, color: muted, fontSize: 21, lineHeight: 1.32, maxWidth: 480 }}>
            Real skills for a real workflow, with a public audit and an install path for every pick.
          </div>
          <div style={{ display: 'flex', marginTop: 'auto', color: green, fontSize: 17, fontWeight: 760 }}>
            Find the right skill automatically -&gt;
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', border: `1px solid ${border}`, backgroundColor: card, padding: '24px 28px' }}>
          <div style={{ display: 'flex', color: muted, fontSize: 12, fontWeight: 760, letterSpacing: 2.2 }}>WHAT TO ADD NEXT</div>
          {shortlist.picks.slice(0, 5).map((pick, index) => (
            <div key={pick.skill.slug} style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: `1px solid ${border}`, padding: '15px 0', marginTop: index === 0 ? 12 : 0 }}>
              <div style={{ display: 'flex', width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: index === 0 ? green : '#eee8dc', color: index === 0 ? '#fff' : ink, fontSize: 13, fontWeight: 760 }}>
                {String(index + 1).padStart(2, '0')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ display: 'flex', color: green, fontSize: 11, fontWeight: 760, letterSpacing: 1.7 }}>{pick.role.toUpperCase()}</span>
                <span style={{ display: 'flex', marginTop: 4, fontSize: 20, fontWeight: 740 }}>{truncate(pick.skill.name, 34)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

function WorkflowSlide({ shortlist }: { shortlist: XShortlist }) {
  const steps = shortlist.picks.slice(0, 4)
  return (
    <Frame label="WORKFLOW MAP">
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', paddingTop: 52 }}>
        <div style={{ display: 'flex', fontFamily: 'Georgia, serif', fontSize: 52, lineHeight: 1, fontWeight: 700 }}>
          Give the agent a path, not a blank prompt.
        </div>
        <div style={{ display: 'flex', marginTop: 28, color: muted, fontSize: 20, lineHeight: 1.35, maxWidth: 740 }}>
          This shortlist covers the working steps an agent needs before it can produce a reliable result.
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
          {steps.map((pick, index) => (
            <div key={pick.skill.slug} style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', borderRight: index < steps.length - 1 ? `1px solid ${border}` : 'none', padding: '24px 20px' }}>
              <span style={{ display: 'flex', color: muted, fontSize: 12, fontWeight: 760, letterSpacing: 2 }}>{String(index + 1).padStart(2, '0')}</span>
              <span style={{ display: 'flex', marginTop: 14, color: green, fontSize: 14, fontWeight: 760 }}>{pick.role}</span>
              <span style={{ display: 'flex', marginTop: 6, fontSize: 22, fontWeight: 740 }}>{truncate(pick.skill.name, 23)}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

function PicksSlide({ shortlist }: { shortlist: XShortlist }) {
  return (
    <Frame label="CURATED PICKS">
      <div style={{ display: 'flex', flex: 1, gap: 36, paddingTop: 40 }}>
        <div style={{ display: 'flex', width: 400, flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: muted, fontSize: 13, fontWeight: 760, letterSpacing: 3 }}>{shortlist.config.eyebrow.toUpperCase()}</div>
          <div style={{ display: 'flex', marginTop: 20, fontFamily: 'Georgia, serif', fontSize: 50, lineHeight: 1, fontWeight: 700 }}>
            Five picks. Five different jobs.
          </div>
          <div style={{ display: 'flex', marginTop: 22, color: muted, fontSize: 19, lineHeight: 1.35 }}>
            Popularity alone is not a workflow. Each pick earns a role in the list.
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 10 }}>
          {shortlist.picks.slice(0, 5).map((pick, index) => (
            <div key={pick.skill.slug} style={{ display: 'flex', alignItems: 'center', minHeight: 73, border: `1px solid ${border}`, backgroundColor: card, padding: '0 20px', gap: 18 }}>
              <span style={{ display: 'flex', width: 28, color: muted, fontFamily: 'monospace', fontSize: 13 }}>{String(index + 1).padStart(2, '0')}</span>
              <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
                <span style={{ display: 'flex', color: green, fontSize: 11, fontWeight: 760, letterSpacing: 1.7 }}>{pick.role.toUpperCase()}</span>
                <span style={{ display: 'flex', marginTop: 4, fontSize: 21, fontWeight: 740 }}>{truncate(pick.skill.name, 35)}</span>
              </div>
              <span style={{ display: 'flex', color: muted, fontFamily: 'monospace', fontSize: 13 }}>{pick.qualityScore}/100</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

function TrustSlide({ shortlist }: { shortlist: XShortlist }) {
  return (
    <Frame label="REVIEW BEFORE INSTALL">
      <div style={{ display: 'flex', flex: 1, gap: 34, paddingTop: 48 }}>
        <div style={{ display: 'flex', width: 490, flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Georgia, serif', fontSize: 54, lineHeight: 0.98, fontWeight: 700 }}>
            Useful is not enough. It has to be reviewable.
          </div>
          <div style={{ display: 'flex', marginTop: 22, color: muted, fontSize: 20, lineHeight: 1.35 }}>
            Every shortlist links to a public audit, install path, and alternative before an agent acts.
          </div>
          <div style={{ display: 'flex', marginTop: 'auto', color: green, fontSize: 16, fontWeight: 760 }}>
            OpenAgentSkill trust layer
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 12 }}>
          {shortlist.picks.slice(0, 4).map((pick) => (
            <div key={pick.skill.slug} style={{ display: 'flex', alignItems: 'center', border: `1px solid ${border}`, backgroundColor: card, padding: '17px 20px', gap: 16 }}>
              <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
                <span style={{ display: 'flex', fontSize: 19, fontWeight: 740 }}>{truncate(pick.skill.name, 34)}</span>
                <span style={{ display: 'flex', marginTop: 5, color: muted, fontSize: 13 }}>{truncate(pick.reason, 58)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ display: 'flex', color: green, fontSize: 20, fontWeight: 780 }}>{pick.qualityScore}</span>
                <span style={{ display: 'flex', color: muted, fontSize: 10, fontWeight: 760, letterSpacing: 1.3 }}>QUALITY</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

export default async function Image({
  params,
}: {
  params: Promise<{ lane: string; slide: string }>
}) {
  const { lane, slide } = await params
  if (!isXShortlistLane(lane) || !slides.has(slide)) return new Response('Not Found', { status: 404 })
  const shortlist = await getXShortlist(lane).catch(() => null)
  if (!shortlist || shortlist.picks.length < 3) return new Response('Not Found', { status: 404 })

  const content = slide === 'workflow'
    ? <WorkflowSlide shortlist={shortlist} />
    : slide === 'picks'
      ? <PicksSlide shortlist={shortlist} />
      : slide === 'trust'
        ? <TrustSlide shortlist={shortlist} />
        : <CoverSlide shortlist={shortlist} />

  return new ImageResponse(content, size)
}
