import type { SkillOutcomeStats } from '@/lib/db/skills'

export function createEmptyOutcomeStats(skillSlug: string): SkillOutcomeStats {
  return {
    skill_slug: skillSlug,
    total_outcomes: 0,
    successful_outcomes: 0,
    failed_outcomes: 0,
    not_relevant_outcomes: 0,
    risk_blocked_outcomes: 0,
    setup_required_outcomes: 0,
    install_attempts: 0,
    success_rate: null,
    last_outcome_at: null,
    updated_at: new Date(0).toISOString(),
  }
}

export function formatOutcomeSuccessRate(stats: SkillOutcomeStats | null | undefined) {
  if (!stats || stats.success_rate === null || stats.success_rate === undefined) return 'No data'
  return `${Math.round(Number(stats.success_rate))}%`
}

export function getOutcomeReadinessLabel(stats: SkillOutcomeStats | null | undefined) {
  const total = Number(stats?.total_outcomes || 0)
  const successRate = stats?.success_rate === null || stats?.success_rate === undefined
    ? null
    : Number(stats.success_rate)

  if (total === 0) return 'Ready for first outcome'
  if (successRate !== null && successRate >= 85 && total >= 3) return 'Strong agent signal'
  if (successRate !== null && successRate < 55 && total >= 3) return 'Needs review'
  if (Number(stats?.risk_blocked_outcomes || 0) > 0) return 'Risk blocks reported'
  if (Number(stats?.setup_required_outcomes || 0) > 0) return 'Setup friction reported'
  return 'Early signal'
}

export function summarizeOutcomeStats(stats: SkillOutcomeStats | null | undefined) {
  const safeStats = stats || createEmptyOutcomeStats('unknown')
  const total = Number(safeStats.total_outcomes || 0)
  const installs = Number(safeStats.install_attempts || 0)
  const riskBlocked = Number(safeStats.risk_blocked_outcomes || 0)
  const setupRequired = Number(safeStats.setup_required_outcomes || 0)
  const successRate = formatOutcomeSuccessRate(safeStats)

  if (total === 0) {
    return 'No agent outcome reports yet. The first resolved run should report success, failed, not_relevant, blocked_by_risk, or setup_required.'
  }

  return `${total.toLocaleString()} outcome${total === 1 ? '' : 's'}, ${successRate} success, ${installs.toLocaleString()} install attempt${installs === 1 ? '' : 's'}, ${riskBlocked.toLocaleString()} risk block${riskBlocked === 1 ? '' : 's'}, ${setupRequired.toLocaleString()} setup-required report${setupRequired === 1 ? '' : 's'}.`
}

export function formatOutcomeStatsText(rows: SkillOutcomeStats[]) {
  if (!rows.length) {
    return [
      'OpenAgentSkill agent outcome stats',
      '',
      'No agent outcomes have been recorded yet.',
      'POST /api/agent/outcome after a resolved skill run to improve Trust Score, rankings, and install recommendations.',
    ].join('\n')
  }

  return [
    'OpenAgentSkill agent outcome stats',
    '',
    ...rows.map((row, index) => [
      `${index + 1}. ${row.skill_slug}`,
      `   Outcomes: ${row.total_outcomes}`,
      `   Success rate: ${formatOutcomeSuccessRate(row)}`,
      `   Install attempts: ${row.install_attempts}`,
      `   Risk blocked: ${row.risk_blocked_outcomes}`,
      `   Setup required: ${row.setup_required_outcomes}`,
      `   Status: ${getOutcomeReadinessLabel(row)}`,
    ].join('\n')),
    '',
    'Report an outcome:',
    'POST /api/agent/outcome',
    'Expected outcomes: success, failed, not_relevant, blocked_by_risk, setup_required',
    'Optional quality fields: task_success, output_quality 1-5, error_type, human_review_required, workspace, evidence_url',
    'Validate first with dry_run=true when wiring a new agent integration.',
  ].join('\n')
}
