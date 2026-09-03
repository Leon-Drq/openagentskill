const paper = '#FBFAF6'
const ink = '#1D1B18'
const muted = '#6D675E'
const border = '#D8D2C6'
const registryGreen = '#006B4F'
const selectedGreen = '#E8F1ED'
const rule = '#E4E0D8'

type SkillSocialCardProps = {
  name: string
  slug: string
  scenario: string
  score?: number
  safety: string
  stars: string
  install: string
}

function titleSize(name: string) {
  if (name.length <= 14) return 104
  if (name.length <= 23) return 84
  if (name.length <= 34) return 68
  return 54
}

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 128 128" style={{ display: 'flex' }}>
      <path
        fill={ink}
        d="M58.5 12.5C35.1 15.4 17.5 40.8 17.5 64c0 23.2 17.6 48.6 41 51.5C43.2 114.3 35.5 91.7 35.5 64S43.2 13.7 58.5 12.5Z"
      />
      <path
        fill={ink}
        d="M69.5 12.5c23.4 2.9 41 28.3 41 51.5 0 23.2-17.6 48.6-41 51.5C84.8 114.3 92.5 91.7 92.5 64S84.8 13.7 69.5 12.5Z"
      />
    </svg>
  )
}

function Evidence({ label, value, width }: { label: string; value: string; width: number }) {
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          color: muted,
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          color: label === 'QUALITY' ? registryGreen : ink,
          fontFamily: 'monospace',
          fontSize: value.length > 38 ? 14 : value.length > 24 ? 16 : 19,
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function SkillSocialCard({
  name,
  slug,
  scenario,
  score,
  safety,
  stars,
  install,
}: SkillSocialCardProps) {
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
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,27,24,0.10) 1px, transparent 0)',
          backgroundSize: '18px 18px',
          opacity: 0.22,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 38,
          left: 54,
          right: 54,
          height: 54,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${border}`,
          paddingBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <BrandMark />
          <div style={{ display: 'flex', fontSize: 23, fontWeight: 760, letterSpacing: -0.5 }}>
            OpenAgentSkill
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            color: muted,
            fontFamily: 'monospace',
            fontSize: 15,
            letterSpacing: -0.2,
          }}
        >
          openagentskill.com/skills/{slug}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 124,
          left: 64,
          right: 64,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: muted,
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2.2,
          }}
        >
          <span
            style={{
              display: 'flex',
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: registryGreen,
            }}
          />
          VERIFIED SKILL MANIFEST
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 14,
            color: ink,
            fontFamily: 'serif',
            fontSize: titleSize(name),
            fontWeight: 400,
            lineHeight: 0.94,
            letterSpacing: name.length <= 18 ? -3.5 : -2,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 280,
          left: 54,
          right: 54,
          height: 146,
          display: 'flex',
          flexDirection: 'column',
          borderTop: `1px solid ${border}`,
          borderBottom: `1px solid ${border}`,
          backgroundColor: '#FFFDF8',
        }}
      >
        <div
          style={{
            height: 46,
            display: 'flex',
            alignItems: 'center',
            color: muted,
            fontFamily: 'monospace',
            fontSize: 15,
          }}
        >
          <span style={{ display: 'flex', width: 52, justifyContent: 'flex-end', marginRight: 22, color: '#A29B90' }}>
            01
          </span>
          <span style={{ display: 'flex', color: registryGreen }}>name:</span>
          <span style={{ display: 'flex', marginLeft: 12, color: ink }}>{name}</span>
        </div>

        <div
          style={{
            position: 'relative',
            height: 76,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: selectedGreen,
            borderTop: `1px solid ${rule}`,
            borderBottom: `1px solid ${rule}`,
            fontFamily: 'monospace',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              display: 'flex',
              backgroundColor: registryGreen,
            }}
          />
          <span style={{ display: 'flex', width: 52, justifyContent: 'flex-end', marginRight: 22, color: '#6F8F83', fontSize: 15 }}>
            02
          </span>
          <span style={{ display: 'flex', color: registryGreen, fontSize: 17, fontWeight: 700 }}>use_when:</span>
          <span
            style={{
              display: 'flex',
              flex: 1,
              marginLeft: 14,
              color: ink,
              fontSize: scenario.length > 76 ? 18 : 21,
              fontWeight: 550,
              letterSpacing: -0.25,
              whiteSpace: 'nowrap',
            }}
          >
            {scenario}
          </span>
        </div>

        <div
          style={{
            height: 24,
            display: 'flex',
            alignItems: 'center',
            color: '#A29B90',
            fontFamily: 'monospace',
            fontSize: 13,
          }}
        >
          <span style={{ display: 'flex', width: 52, justifyContent: 'flex-end', marginRight: 22 }}>03</span>
          <span style={{ display: 'flex' }}>---</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 52,
          height: 82,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          borderTop: `1px solid ${border}`,
          paddingTop: 22,
        }}
      >
        <Evidence label="QUALITY" value={score && score > 0 ? `${score}/100` : '—'} width={130} />
        <Evidence label="SAFETY AUDIT" value={safety.toUpperCase()} width={190} />
        <Evidence label="GITHUB SIGNAL" value={stars} width={190} />
        <Evidence label="INSTALL" value={install} width={455} />
      </div>
    </div>
  )
}
