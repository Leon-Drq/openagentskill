import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Open Agent Skill — The Open Infrastructure for Agent Intelligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111111',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.06,
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: '2px',
            backgroundColor: '#ffffff',
            opacity: 0.2,
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#ffffff',
              }}
            >
              {'/>'}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1,
              display: 'flex',
              textAlign: 'center',
            }}
          >
            OPEN AGENT SKILL
          </div>

          {/* Divider */}
          <div
            style={{
              width: '80px',
              height: '1px',
              backgroundColor: 'rgba(255,255,255,0.4)',
              display: 'flex',
              margin: '4px 0',
            }}
          />

          {/* Subtitle */}
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 400,
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
              display: 'flex',
              textAlign: 'center',
            }}
          >
            The Open Infrastructure for Agent Intelligence
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '48px',
              marginTop: '24px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px',
              letterSpacing: '1px',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ display: 'flex' }}>SKILLS</span>
            <span style={{ display: 'flex' }}>AGENTS</span>
            <span style={{ display: 'flex' }}>PROTOCOL</span>
            <span style={{ display: 'flex' }}>OPEN SOURCE</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          <span style={{ display: 'flex' }}>openagentskill.com</span>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '2px',
            backgroundColor: '#ffffff',
            opacity: 0.2,
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
