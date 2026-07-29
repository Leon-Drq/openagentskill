import { auditRiskLabel, type ComputedSkillAudit } from '@/lib/audits'
import { SkillDetailText, SkillDetailValue } from '@/components/skill-detail-text'
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
      label: 'quality' as const,
      value: quality.score,
      status: quality.label,
      detail: quality.summary,
    },
    trust && {
      label: 'trust' as const,
      value: trust.score,
      status: trust.label,
      detail: trust.summary,
    },
    audit && {
      label: 'audit' as const,
      value: audit.audit_score,
      status: auditRiskLabel(audit.risk_level),
      detail: '',
      detailKey: 'auditReportDescription' as const,
    },
  ].filter(Boolean) as Array<{
    label: 'quality' | 'trust' | 'audit'
    value: number
    status: string
    detail: string
    detailKey?: 'auditReportDescription'
  }>

  if (rows.length === 0) return null
  const evidenceRows = trust
    ? [
        { label: 'stars' as const, value: trust.evidence.stars },
        { label: 'repoActivity' as const, value: trust.evidence.repoActivity },
        { label: 'maintenance' as const, value: trust.evidence.lastPushed },
        { label: 'license' as const, value: trust.evidence.license },
        { label: 'install' as const, value: trust.evidence.install },
        { label: 'installSafety' as const, value: trust.evidence.installSafety },
        {
          label: 'permissionSurface' as const,
          value: trust.evidence.permissionSurface,
        },
        { label: 'agentOutcomes' as const, value: trust.evidence.agentOutcomes },
        { label: 'docs' as const, value: trust.evidence.documentation },
      ]
    : []

  return (
    <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
      <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
        <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
            <SkillDetailText id="adoptionScorecard" />
          </p>
          <h2 className="max-w-3xl font-display text-2xl font-semibold leading-tight sm:text-3xl">
            <SkillDetailText id="scorecardTitle" />
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
            <SkillDetailText id="scorecardDescription" />
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
                  <SkillDetailText id={row.label} />
                </p>
                <span
                  className={`mt-2 inline-flex max-w-full rounded-[6px] border px-2 py-1 font-mono text-[11px] leading-tight ${labelTone(row.value)}`}
                >
                  <SkillDetailValue value={row.status} />
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
              {row.detailKey ? (
                <SkillDetailText id={row.detailKey} />
              ) : (
                <SkillDetailValue value={row.detail} />
              )}
            </p>
          </div>
        ))}
      </div>
      {trust && (
        <div className="border-t border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[0.86fr_1.14fr]">
            <div className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                <SkillDetailText id="trustScore" /> {trust.version === 'trust-score-v5' ? 'v5' : 'v4'}
              </p>
              <h3 className="font-display text-2xl font-semibold leading-tight">
                <SkillDetailValue value={trust.installReadiness.label} />
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                <SkillDetailValue value={trust.recommendedAction} />
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
                    <SkillDetailText id={item.label} />
                  </p>
                  <p className="mt-2 break-words text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
                    <SkillDetailValue value={item.value} />
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 border-t border-border bg-[#fbfaf7] p-3 md:grid-cols-2">
            {[
              {
                eyebrow: 'riskSummary' as const,
                title: trust.riskSummary.label,
                notes: trust.riskSummary.notes.slice(0, 4),
              },
              {
                eyebrow: 'installReadiness' as const,
                title: trust.installReadiness.ready
                  ? 'installPathAvailable'
                  : 'installPathNeedsReview',
                notes: trust.installReadiness.notes.slice(0, 4),
              },
            ].map((section) => (
              <div
                key={section.eyebrow}
                className="rounded-[8px] border border-border bg-background p-5"
              >
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                  <SkillDetailText id={section.eyebrow} />
                </p>
                <h3 className="font-semibold">
                  {section.eyebrow === 'riskSummary' ? (
                    <SkillDetailValue value={section.title} />
                  ) : (
                    <SkillDetailText id={section.title as 'installPathAvailable' | 'installPathNeedsReview'} />
                  )}
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-secondary">
                  {section.notes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#006b4f]" />
                      <span><SkillDetailValue value={note} /></span>
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
