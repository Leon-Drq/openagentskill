import { auditRiskLabel, type ComputedSkillAudit } from '@/lib/audits'
import type { SkillQualityProfile } from '@/lib/quality'
import type { SkillTrustProfile } from '@/lib/trust'

interface SkillScorePanelProps {
  quality: SkillQualityProfile | null
  trust: SkillTrustProfile | null
  audit: ComputedSkillAudit | null
}

function toneClass(value: number) {
  if (value >= 82) return 'bg-foreground'
  if (value >= 60) return 'bg-amber-600'
  return 'bg-red-700'
}

function labelTone(value: number) {
  if (value >= 82) return 'border-foreground text-foreground'
  if (value >= 60) return 'border-amber-300 text-amber-700'
  return 'border-red-300 text-red-700'
}

export function SkillScorePanel({ quality, trust, audit }: SkillScorePanelProps) {
  const rows = [
    quality && {
      label: 'Quality',
      value: quality.score,
      status: quality.label,
      detail: quality.summary,
    },
    trust && {
      label: 'Trust',
      value: trust.score,
      status: trust.label,
      detail: trust.summary,
    },
    audit && {
      label: 'Audit',
      value: audit.audit_score,
      status: auditRiskLabel(audit.risk_level),
      detail: 'Install readiness, security metadata, maintenance, and adoption risk.',
    },
  ].filter(Boolean) as Array<{ label: string; value: number; status: string; detail: string }>

  if (rows.length === 0) return null

  return (
    <section className="mb-10 border border-border bg-card">
      <div className="border-b border-border p-5">
        <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Agent adoption scorecard</p>
        <h2 className="font-display text-2xl font-semibold">Trust, audit, and install readiness at a glance</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
          These scores combine public repository metadata, OpenAgentSkill review signals, maintenance freshness, and
          install readiness. They are a shortlist signal, not a replacement for human review.
        </p>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="bg-background p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-secondary">{row.label}</p>
                <span className={`mt-2 inline-flex border px-2 py-0.5 font-mono text-xs ${labelTone(row.value)}`}>
                  {row.status}
                </span>
              </div>
              <div className="font-mono text-4xl font-semibold tabular-nums">{row.value}</div>
            </div>
            <div className="mb-4 h-1.5 bg-muted">
              <div className={`h-full ${toneClass(row.value)}`} style={{ width: `${row.value}%` }} />
            </div>
            <p className="text-sm leading-relaxed text-secondary">{row.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
