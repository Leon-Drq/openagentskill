import { auditRiskLabel, type ComputedSkillAudit } from '@/lib/audits'
import type { SkillQualityProfile } from '@/lib/quality'
import type { SkillTrustProfile, SkillTrustProfileV5 } from '@/lib/trust'

interface SkillScorePanelProps {
  quality: SkillQualityProfile | null
  trust: SkillTrustProfile | SkillTrustProfileV5 | null
  audit: ComputedSkillAudit | null
}

function toneClass(value: number) {
  if (value >= 82) return 'bg-[#006b4f]'
  if (value >= 60) return 'bg-amber-600'
  return 'bg-red-700'
}

function labelTone(value: number) {
  if (value >= 82) return 'border-[#c8ded5] bg-[#eef7f2] text-[#006b4f]'
  if (value >= 60) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

export function SkillScorePanel({
  quality,
  trust,
  audit,
}: SkillScorePanelProps) {
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
      detail:
        'Install readiness, security metadata, maintenance, and adoption risk.',
    },
  ].filter(Boolean) as Array<{
    label: string
    value: number
    status: string
    detail: string
  }>

  if (rows.length === 0) return null
  const evidenceRows = trust
    ? [
        { label: 'Stars', value: trust.evidence.stars },
        { label: 'Repo activity', value: trust.evidence.repoActivity },
        { label: 'Maintenance', value: trust.evidence.lastPushed },
        { label: 'License', value: trust.evidence.license },
        { label: 'Install', value: trust.evidence.install },
        { label: 'Install safety', value: trust.evidence.installSafety },
        {
          label: 'Permission surface',
          value: trust.evidence.permissionSurface,
        },
        { label: 'Agent outcomes', value: trust.evidence.agentOutcomes },
        { label: 'Docs', value: trust.evidence.documentation },
      ]
    : []

  return (
    <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
      <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
        <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
            Agent adoption scorecard
          </p>
          <h2 className="max-w-3xl font-display text-2xl font-semibold leading-tight sm:text-3xl">
            Trust, audit, and install readiness at a glance
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
            These scores combine public repository metadata, OpenAgentSkill
            review signals, maintenance freshness, and install readiness. They
            are a shortlist signal, not a replacement for human review.
          </p>
        </div>
      </div>
      <div className="grid gap-3 bg-[#fbfaf7] p-3 md:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-[8px] border border-border bg-background p-4 sm:p-5"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                  {row.label}
                </p>
                <span
                  className={`mt-2 inline-flex max-w-full rounded-[6px] border px-2 py-1 font-mono text-[11px] leading-tight ${labelTone(row.value)}`}
                >
                  {row.status}
                </span>
              </div>
              <div className="shrink-0 font-mono text-4xl font-semibold leading-none tabular-nums">
                {row.value}
              </div>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-[6px] bg-[#ebe7dd]">
              <div
                className={`h-full rounded-[6px] ${toneClass(row.value)}`}
                style={{ width: `${row.value}%` }}
              />
            </div>
            <p className="text-sm leading-relaxed text-secondary">
              {row.detail}
            </p>
          </div>
        ))}
      </div>
      {trust && (
        <div className="border-t border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[0.86fr_1.14fr]">
            <div className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                {trust.version === 'trust-score-v5' ? 'Trust Score v5' : 'Trust Score v4'}
              </p>
              <h3 className="font-display text-2xl font-semibold leading-tight">
                {trust.installReadiness.label}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {trust.recommendedAction}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {trust.agentCompatibility.slice(0, 5).map((agent) => (
                  <span
                    key={agent}
                    className="rounded-[6px] border border-border bg-background px-2 py-1 text-xs text-secondary"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-0 p-5 sm:grid-cols-2 sm:p-6">
              {evidenceRows.map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 border-b border-border py-3 first:pt-0 sm:[&:nth-child(-n+2)]:pt-0"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    {item.label}
                  </p>
                  <p className="mt-2 break-words text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 border-t border-border bg-[#fbfaf7] p-3 md:grid-cols-2">
            {[
              {
                eyebrow: 'Risk summary',
                title: trust.riskSummary.label,
                notes: trust.riskSummary.notes.slice(0, 4),
              },
              {
                eyebrow: 'Install readiness',
                title: trust.installReadiness.ready
                  ? 'Install path available'
                  : 'Install path needs review',
                notes: trust.installReadiness.notes.slice(0, 4),
              },
            ].map((section) => (
              <div
                key={section.eyebrow}
                className="rounded-[8px] border border-border bg-background p-5"
              >
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                  {section.eyebrow}
                </p>
                <h3 className="font-semibold">{section.title}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-secondary">
                  {section.notes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#006b4f]" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
