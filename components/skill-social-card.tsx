const paper = '#F7F5EF'
const ink = '#171713'
const muted = '#6D6A61'
const border = '#D8D4C9'
const green = '#006B4F'
const greenSoft = '#E5F0EB'
const gold = '#C38B24'

type StatusTone = 'verified' | 'reviewed' | 'source' | 'community'

type SkillSocialCardProps = {
  name: string
  slug: string
  scenario: string
  score?: number
  safety: string
  stars: string
  install: string
  statusLabel: string
  statusDetail: string
  statusTone: StatusTone
  creator: string
  repository: string
  avatarUrl?: string | null
}

function titleSize(name: string) {
  if (name.length <= 15) return 78
  if (name.length <= 24) return 66
  if (name.length <= 36) return 54
  return 46
}

function BrandMark({ color = ink }: { color?: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 128 128" style={{ display: 'flex' }}>
      <path fill={color} d="M58.5 12.5C35.1 15.4 17.5 40.8 17.5 64c0 23.2 17.6 48.6 41 51.5C43.2 114.3 35.5 91.7 35.5 64S43.2 13.7 58.5 12.5Z" />
      <path fill={color} d="M69.5 12.5c23.4 2.9 41 28.3 41 51.5 0 23.2-17.6 48.6-41 51.5C84.8 114.3 92.5 91.7 92.5 64S84.8 13.7 69.5 12.5Z" />
    </svg>
  )
}

function Evidence({ label, value, accent = false, width }: { label: string; value: string; accent?: boolean; width: number }) {
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', color: muted, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.7 }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          color: accent ? green : ink,
          fontFamily: 'monospace',
          fontSize: value.length > 32 ? 13 : value.length > 22 ? 15 : 18,
          fontWeight: 700,
          lineHeight: 1.05,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function statusColors(tone: StatusTone) {
  if (tone === 'verified') return { foreground: '#FFFFFF', background: green, dot: '#9BE4C7' }
  if (tone === 'reviewed') return { foreground: ink, background: '#EFE4CA', dot: gold }
  if (tone === 'source') return { foreground: '#174737', background: greenSoft, dot: green }
  return { foreground: '#4D4A43', background: '#E9E6DE', dot: '#8B877E' }
}

export function SkillSocialCard({
  name,
  slug,
  scenario,
  score,
  safety,
  stars,
  install,
  statusLabel,
  statusDetail,
  statusTone,
  creator,
  repository,
  avatarUrl,
}: SkillSocialCardProps) {
  const status = statusColors(statusTone)
  const creatorInitial = creator.slice(0, 1).toUpperCase() || 'O'

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

      <div style={{ position: 'absolute', left: 50, right: 50, top: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <BrandMark />
          <div style={{ display: 'flex', fontSize: 23, fontWeight: 800, letterSpacing: -0.6 }}>OpenAgentSkill</div>
          <div style={{ display: 'flex', marginLeft: 7, borderLeft: `1px solid ${border}`, paddingLeft: 18, color: muted, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 1.8 }}>
            SKILL PASSPORT
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: muted, fontFamily: 'monospace', fontSize: 13 }}>
          <span style={{ display: 'flex', width: 7, height: 7, borderRadius: 99, backgroundColor: green }} />
          openagentskill.com/skills/{slug}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 50, right: 50, top: 88, height: 1, display: 'flex', backgroundColor: border }} />

      <div style={{ position: 'absolute', left: 50, right: 50, top: 112, display: 'flex', justifyContent: 'space-between', gap: 36 }}>
        <div style={{ width: 820, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                borderRadius: 999,
                padding: '9px 13px',
                color: status.foreground,
                backgroundColor: status.background,
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.25,
              }}
            >
              <span style={{ display: 'flex', width: 7, height: 7, borderRadius: 99, backgroundColor: status.dot }} />
              {statusLabel}
            </div>
            <div style={{ display: 'flex', color: muted, fontFamily: 'monospace', fontSize: 12 }}>{statusDetail}</div>
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 18,
              color: ink,
              fontFamily: 'Georgia, serif',
              fontSize: titleSize(name),
              fontWeight: 700,
              lineHeight: 0.96,
              letterSpacing: -2.2,
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>

          <div style={{ display: 'flex', marginTop: 18, maxWidth: 800, color: '#49463F', fontSize: scenario.length > 72 ? 19 : 22, lineHeight: 1.35 }}>
            {scenario}
          </div>
        </div>

        <div style={{ width: 220, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 999, border: `2px solid ${paper}`, outline: `1px solid ${border}`, backgroundColor: greenSoft, color: green, fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700 }}>
            {creatorInitial}
            {avatarUrl ? (
              // ImageResponse supports regular image elements; the initial remains a resilient fallback.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" width="72" height="72" style={{ position: 'absolute', inset: 0, width: 72, height: 72, objectFit: 'cover' }} />
            ) : null}
          </div>
          <div style={{ display: 'flex', marginTop: 13, color: ink, fontFamily: 'monospace', fontSize: 15, fontWeight: 800 }}>@{creator}</div>
          <div style={{ display: 'flex', marginTop: 6, maxWidth: 220, color: muted, fontFamily: 'monospace', fontSize: 11, textAlign: 'right' }}>{repository}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 50, right: 50, bottom: 42, height: 150, display: 'flex', flexDirection: 'column', border: `1px solid ${border}`, backgroundColor: '#FFFEFA' }}>
        <div style={{ height: 74, display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: `1px solid ${border}` }}>
          <Evidence label="QUALITY" value={score && score > 0 ? `${score}/100` : 'NOT SCORED'} accent width={135} />
          <Evidence label="SAFETY" value={safety.toUpperCase()} width={180} />
          <Evidence label="PROJECT SIGNAL" value={stars} width={175} />
          <Evidence label="INSTALL COMMAND" value={install} width={470} />
        </div>
        <div style={{ height: 75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: muted, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ display: 'flex', color: green }}>DISCOVER</span>
            <span style={{ display: 'flex' }}>→</span>
            <span style={{ display: 'flex' }}>VERIFY</span>
            <span style={{ display: 'flex' }}>→</span>
            <span style={{ display: 'flex' }}>INSTALL</span>
            <span style={{ display: 'flex' }}>→</span>
            <span style={{ display: 'flex' }}>PROVE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', borderRadius: 999, backgroundColor: ink, color: '#FFFFFF', padding: '13px 18px', fontSize: 15, fontWeight: 800 }}>
            View skill &amp; install&nbsp; →
          </div>
        </div>
      </div>
    </div>
  )
}
