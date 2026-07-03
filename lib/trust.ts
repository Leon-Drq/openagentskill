import type { SkillAgentStats, SkillEventStats, SkillOutcomeStats, SkillRecord } from '@/lib/db/skills'
import { getAgentProvenProfile } from '@/lib/agent-proven'
import { formatCompactNumber, getFreshnessDays } from '@/lib/quality'

export type SkillTrustTier = 'production' | 'strong' | 'review' | 'risk'
export type TrustCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface SkillTrustCheck {
  label: string
  status: TrustCheckStatus
  detail: string
}

export interface SkillTrustDimension {
  id: string
  label: string
  score: number
  weight: number
  status: TrustCheckStatus
  detail: string
}

export type SkillTrustInstallPolicy = 'agent_install_candidate' | 'human_review_before_install' | 'sandbox_only'
export type SkillTrustRiskLevel = 'low' | 'medium' | 'high'

export interface SkillTrustEvidence {
  stars: string
  repoActivity: string
  lastPushed: string
  license: string
  repository: string
  install: string
  installSafety: string
  permissionSurface: string
  documentation: string
  agentOutcomes: string
}

export interface SkillTrustInstallReadiness {
  ready: boolean
  command: string | null
  policy: SkillTrustInstallPolicy
  label: string
  notes: string[]
}

export interface SkillTrustRiskSummary {
  level: SkillTrustRiskLevel
  label: string
  notes: string[]
}

export interface SkillTrustOutcomeEvidence {
  total: number
  successes: number
  failures: number
  notRelevant: number
  successRate: number | null
  installAttempts: number
  riskBlocked: number
  setupRequired: number
  installSuccessRate: number | null
  avgOutputQuality: number | null
  avgTimeToUsefulMs: number | null
  productionOutcomes: number
  humanReviewRequired: number
  recentSuccessRate: number | null
  recentFailureRate: number | null
  uniqueAgents: number
  agentProvenScore: number
  agentProvenLabel: string
  lastOutcomeAt: string | null
  label: string
}

export interface SkillTrustAutoInstall {
  allowed: boolean
  sandboxRequired: boolean
  policy: SkillTrustInstallPolicy
  reason: string
}

export interface SkillTrustProfile {
  version: 'trust-score-v4'
  score: number
  tier: SkillTrustTier
  label: string
  summary: string
  recommendedAction: string
  dimensions: SkillTrustDimension[]
  checks: SkillTrustCheck[]
  strengths: string[]
  warnings: string[]
  evidence: SkillTrustEvidence
  installReadiness: SkillTrustInstallReadiness
  agentCompatibility: string[]
  riskSummary: SkillTrustRiskSummary
  outcomeEvidence: SkillTrustOutcomeEvidence
  autoInstall: SkillTrustAutoInstall
  bestFor: string[]
  doNotUseFor: string[]
  knownRisks: string[]
}

export interface SkillTrustV5Decision {
  install_policy: SkillTrustInstallPolicy
  auto_install_allowed: boolean
  human_review_required: boolean
  sandbox_first: boolean
  agent_action: string
  reasoning: string[]
  review_required_when: string[]
}

export interface SkillTrustV5OutcomeLoop {
  version: 'openagentskill-agent-outcome-v3'
  required_after_install: boolean
  endpoint: '/api/agent/outcome'
  method: 'POST'
  event_id_source: string
  expected_outcomes: string[]
  required_fields: string[]
  quality_fields: string[]
  ranking_inputs_updated: string[]
}

export interface SkillTrustProfileV5 {
  version: 'trust-score-v5'
  score: number
  base_score: number
  outcome_confidence: number
  tier: SkillTrustTier
  label: string
  summary: string
  recommendedAction: string
  decision: SkillTrustV5Decision
  dimensions: SkillTrustDimension[]
  checks: SkillTrustCheck[]
  strengths: string[]
  warnings: string[]
  evidence: SkillTrustEvidence & {
    agentProvenScore: number
    outcomeConfidence: string
    installPolicy: string
  }
  installReadiness: SkillTrustInstallReadiness
  agentCompatibility: string[]
  riskSummary: SkillTrustRiskSummary
  outcomeEvidence: SkillTrustOutcomeEvidence
  autoInstall: SkillTrustAutoInstall
  outcome_loop: SkillTrustV5OutcomeLoop
  agent_contract: {
    suited_tasks: string[]
    suited_agents: string[]
    install_command: string | null
    trust_score: number
    trust_version: 'trust-score-v5'
    risk_level: SkillTrustRiskLevel
    do_not_use_when: string[]
    before_install: string[]
    after_run: string[]
  }
  bestFor: string[]
  doNotUseFor: string[]
  knownRisks: string[]
  backward_compatible: {
    trust_score_v4: Pick<SkillTrustProfile, 'version' | 'score' | 'tier' | 'label' | 'summary'>
  }
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function hasKnownLicense(skill: SkillRecord) {
  const license = (skill.license || '').trim().toLowerCase()
  return Boolean(license && license !== 'unknown' && license !== 'other')
}

function hasRepository(skill: SkillRecord) {
  return Boolean(skill.repository || skill.github_repo)
}

function hasInstallPath(skill: SkillRecord) {
  return Boolean(skill.install_command || skill.github_repo || skill.npm_package)
}

function getInstallCommand(skill: SkillRecord) {
  if (skill.install_command) return skill.install_command
  if (skill.github_repo) return `npx skills add ${skill.github_repo}`
  if (skill.repository?.startsWith('https://github.com/')) {
    return `npx skills add ${skill.repository.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '')}`
  }
  if (skill.npm_package) return `npm install ${skill.npm_package}`
  return null
}

function getMaintenanceLabel(days: number | null) {
  if (days === null) return 'Unknown'
  if (days === 0) return 'Pushed today'
  if (days < 31) return `${days}d since push`
  if (days < 365) return `${Math.round(days / 30)}mo since push`
  return `${Math.round(days / 365)}y since push`
}

function getDocumentationLabel(score: number) {
  if (score >= 82) return 'Strong README/SKILL.md context'
  if (score >= 62) return 'Usable metadata, review docs'
  if (score >= 42) return 'Thin public metadata'
  return 'Missing useful documentation signals'
}

function getAgentCompatibility(skill: SkillRecord) {
  return [
    ...(skill.frameworks || []),
    'Codex',
    'Claude Code',
    'Cursor',
    'OpenAgentSkill CLI',
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 6)
}

function getInstallPolicy(score: number, hasInstall: boolean, hasRepo: boolean, hasLicense: boolean): SkillTrustInstallPolicy {
  if (score >= 86 && hasInstall && hasRepo && hasLicense) return 'agent_install_candidate'
  if (score >= 60 && hasInstall && hasRepo) return 'human_review_before_install'
  return 'sandbox_only'
}

function getInstallPolicyLabel(policy: SkillTrustInstallPolicy) {
  if (policy === 'agent_install_candidate') return 'Agent install candidate'
  if (policy === 'human_review_before_install') return 'Human review before install'
  return 'Sandbox only'
}

function getRiskSummary(score: number, warnings: string[]): SkillTrustRiskSummary {
  if (score >= 82 && warnings.length <= 1) {
    return {
      level: 'low',
      label: 'Low metadata risk',
      notes: warnings.length ? warnings.slice(0, 3) : ['No major trust warnings detected from available metadata'],
    }
  }

  if (score >= 58) {
    return {
      level: 'medium',
      label: 'Review before production',
      notes: warnings.slice(0, 5),
    }
  }

  return {
    level: 'high',
    label: 'High review required',
    notes: warnings.length ? warnings.slice(0, 5) : ['Trust signals are too sparse for automatic installation'],
  }
}

type TrustOutcomeStats = SkillOutcomeStats | SkillAgentStats | null | undefined

function getOutcomeEvidence(outcomeStats: TrustOutcomeStats): SkillTrustOutcomeEvidence {
  if (!outcomeStats) {
    return {
      total: 0,
      successes: 0,
      failures: 0,
      notRelevant: 0,
      successRate: null,
      installAttempts: 0,
      riskBlocked: 0,
      setupRequired: 0,
      installSuccessRate: null,
      avgOutputQuality: null,
      avgTimeToUsefulMs: null,
      productionOutcomes: 0,
      humanReviewRequired: 0,
      recentSuccessRate: null,
      recentFailureRate: null,
      uniqueAgents: 0,
      agentProvenScore: 0,
      agentProvenLabel: 'Needs first agent run',
      lastOutcomeAt: null,
      label: 'No agent outcome data yet',
    }
  }

  if ('total_outcomes' in outcomeStats) {
    const successRate =
      outcomeStats.success_rate === null || outcomeStats.success_rate === undefined
        ? null
        : Number(outcomeStats.success_rate)
    const proven = getAgentProvenProfile(outcomeStats)
    return {
      total: Number(outcomeStats.total_outcomes || 0),
      successes: Number(outcomeStats.successful_outcomes || 0),
      failures: Number(outcomeStats.failed_outcomes || 0),
      notRelevant: Number(outcomeStats.not_relevant_outcomes || 0),
      successRate,
      installAttempts: Number(outcomeStats.install_attempts || 0),
      riskBlocked: Number(outcomeStats.risk_blocked_outcomes || 0),
      setupRequired: Number(outcomeStats.setup_required_outcomes || 0),
      installSuccessRate: outcomeStats.install_success_rate === null || outcomeStats.install_success_rate === undefined ? null : Number(outcomeStats.install_success_rate),
      avgOutputQuality: outcomeStats.avg_output_quality === null || outcomeStats.avg_output_quality === undefined ? null : Number(outcomeStats.avg_output_quality),
      avgTimeToUsefulMs: outcomeStats.avg_time_to_useful_ms === null || outcomeStats.avg_time_to_useful_ms === undefined ? null : Number(outcomeStats.avg_time_to_useful_ms),
      productionOutcomes: Number(outcomeStats.production_outcomes || 0),
      humanReviewRequired: Number(outcomeStats.human_review_required_outcomes || 0),
      recentSuccessRate: outcomeStats.recent_success_rate === null || outcomeStats.recent_success_rate === undefined ? null : Number(outcomeStats.recent_success_rate),
      recentFailureRate: outcomeStats.recent_failure_rate === null || outcomeStats.recent_failure_rate === undefined ? null : Number(outcomeStats.recent_failure_rate),
      uniqueAgents: Number(outcomeStats.unique_agents || 0),
      agentProvenScore: proven.score,
      agentProvenLabel: proven.label,
      lastOutcomeAt: outcomeStats.last_outcome_at || null,
      label:
        Number(outcomeStats.total_outcomes || 0) > 0
          ? `${proven.label}: ${successRate ?? 'unknown'}% success from ${formatCompactNumber(outcomeStats.total_outcomes)} agent outcomes`
          : 'No agent outcome data yet',
    }
  }

  const successRate =
    outcomeStats.success_rate === null || outcomeStats.success_rate === undefined
      ? null
      : Number(outcomeStats.success_rate)
  return {
    total: Number(outcomeStats.total_calls || 0),
    successes: Number(outcomeStats.success_calls || 0),
    failures: Math.max(0, Number(outcomeStats.total_calls || 0) - Number(outcomeStats.success_calls || 0)),
    notRelevant: 0,
    successRate,
    installAttempts: 0,
    riskBlocked: 0,
    setupRequired: 0,
    installSuccessRate: null,
    avgOutputQuality: null,
    avgTimeToUsefulMs: null,
    productionOutcomes: 0,
    humanReviewRequired: 0,
    recentSuccessRate: null,
    recentFailureRate: null,
    uniqueAgents: Number(outcomeStats.unique_agents || 0),
    agentProvenScore: scoreAgentOutcomes({
      total: Number(outcomeStats.total_calls || 0),
      successes: Number(outcomeStats.success_calls || 0),
      failures: Math.max(0, Number(outcomeStats.total_calls || 0) - Number(outcomeStats.success_calls || 0)),
      notRelevant: 0,
      successRate,
      installAttempts: 0,
      riskBlocked: 0,
      setupRequired: 0,
      installSuccessRate: null,
      avgOutputQuality: null,
      avgTimeToUsefulMs: null,
      productionOutcomes: 0,
      humanReviewRequired: 0,
      recentSuccessRate: null,
      recentFailureRate: null,
      uniqueAgents: Number(outcomeStats.unique_agents || 0),
      agentProvenScore: 0,
      agentProvenLabel: 'Legacy agent calls',
      lastOutcomeAt: outcomeStats.last_called_at || null,
      label: 'Legacy agent calls',
    }),
    agentProvenLabel: 'Legacy agent calls',
    lastOutcomeAt: outcomeStats.last_called_at || null,
    label:
      Number(outcomeStats.total_calls || 0) > 0
        ? `${successRate ?? 'unknown'}% success from ${formatCompactNumber(outcomeStats.total_calls)} agent calls`
        : 'No agent outcome data yet',
  }
}

function scoreAgentOutcomes(evidence: SkillTrustOutcomeEvidence) {
  if (evidence.total <= 0) return 54
  if (evidence.agentProvenScore > 0) {
    return clampScore(evidence.agentProvenScore)
  }
  const priorSuccessRate = 70
  const priorWeight = 4
  const bayesianSuccessRate =
    ((evidence.successes + (priorSuccessRate / 100) * priorWeight) /
      Math.max(1, evidence.total + priorWeight)) * 100
  let score = 42 + Math.min(22, Math.log10(evidence.total + 1) * 14)
  score += (bayesianSuccessRate - 60) * 0.48
  score += Math.min(8, Math.log10(evidence.installAttempts + 1) * 5)
  score -= Math.min(18, evidence.riskBlocked * 3)
  score -= Math.min(12, evidence.setupRequired * 2)
  score -= Math.min(10, evidence.notRelevant * 2)
  score -= Math.min(8, evidence.failures * 1.5)

  const capped = evidence.total < 3 ? Math.min(score, 78) : score
  return clampScore(capped)
}

function getBestFor(skill: SkillRecord) {
  const base = [
    skill.category,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)

  if (base.length > 0) return base.slice(0, 6)
  return ['Reusable AI agent workflow']
}

function getDoNotUseFor(skill: SkillRecord, policy: SkillTrustInstallPolicy, evidence: SkillTrustOutcomeEvidence) {
  const items = [
    'Production credentials, payments, or irreversible account changes without explicit human review',
    'Sensitive private data before reviewing repository code, license, and permission surface',
  ]

  if (policy !== 'agent_install_candidate') {
    items.push('Automatic installation in a production workspace')
  }
  if (!hasKnownLicense(skill)) {
    items.push('Commercial reuse before clarifying license terms')
  }
  if (evidence.riskBlocked > 0) {
    items.push('Workflows similar to prior runs blocked by risk signals')
  }
  if (evidence.notRelevant > 0) {
    items.push('Tasks similar to prior runs where this skill was reported not relevant')
  }
  if (evidence.setupRequired > 0) {
    items.push('Zero-setup agent runs without checking required keys, data, or configuration')
  }

  return [...new Set(items)].slice(0, 6)
}

function getTier(score: number): Pick<SkillTrustProfile, 'tier' | 'label' | 'summary' | 'recommendedAction'> {
  if (score >= 86) {
    return {
      tier: 'production',
      label: 'Production candidate',
      summary:
        'Strong OpenAgentSkill Trust Score across adoption, recent maintenance, license clarity, documentation, dependency/runtime risk, install safety, permission surface, and install availability.',
      recommendedAction: 'Shortlist for production use, then run a normal repository and dependency review.',
    }
  }

  if (score >= 72) {
    return {
      tier: 'strong',
      label: 'Strong shortlist',
      summary: 'Good trust signals with a few areas worth checking before rollout.',
      recommendedAction: 'Test in a sandbox workflow and compare its install path with close alternatives.',
    }
  }

  if (score >= 58) {
    return {
      tier: 'review',
      label: 'Manual review',
      summary: 'Potentially useful, but at least one trust signal needs human inspection.',
      recommendedAction: 'Inspect the repository, license, and recent activity before connecting it to agent workflows.',
    }
  }

  return {
    tier: 'risk',
    label: 'High review required',
    summary: 'Sparse or weak trust signals. Treat this as an experimental candidate.',
    recommendedAction: 'Use only in a controlled test environment until missing trust signals are resolved.',
  }
}

function addCheck(
  checks: SkillTrustCheck[],
  status: TrustCheckStatus,
  label: string,
  detail: string
) {
  checks.push({ status, label, detail })
}

function statusForScore(score: number): TrustCheckStatus {
  if (score >= 82) return 'pass'
  if (score >= 62) return 'info'
  if (score >= 42) return 'warn'
  return 'fail'
}

function scoreAdoption(stars: number) {
  if (stars >= 10_000) return 100
  if (stars >= 5_000) return 94
  if (stars >= 1_000) return 86
  if (stars >= 500) return 76
  if (stars >= 100) return 62
  if (stars >= 25) return 48
  return 30
}

function scoreForks(forks: number) {
  if (forks >= 5_000) return 100
  if (forks >= 1_000) return 92
  if (forks >= 250) return 78
  if (forks >= 50) return 62
  if (forks >= 10) return 48
  return 34
}

function trustSignalText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.install_command,
    skill.github_repo,
    skill.repository,
    skill.npm_package,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function scoreMaintenance(days: number | null) {
  if (days === null) return 42
  if (days <= 30) return 100
  if (days <= 90) return 88
  if (days <= 180) return 76
  if (days <= 365) return 62
  if (days <= 730) return 38
  return 22
}

function scoreLicense(skill: SkillRecord) {
  return hasKnownLicense(skill) ? 86 : 42
}

function documentationText(skill: SkillRecord) {
  return [
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.install_command,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
}

function scoreDocumentation(skill: SkillRecord) {
  const text = documentationText(skill)
  let score = 30
  if ((skill.description || '').length >= 80) score += 16
  if ((skill.long_description || '').length >= 240) score += 24
  if (skill.tagline) score += 6
  if ((skill.tags || []).length >= 3) score += 8
  if ((skill.frameworks || []).length > 0) score += 6
  if (/skill\.md|readme|usage|example|examples|install|quickstart/i.test(text)) score += 10
  return clampScore(score)
}

function getInstallCommandSafety(skill: SkillRecord) {
  const command = (getInstallCommand(skill) || '').toLowerCase()
  let penalty = 0
  const notes: string[] = []

  if (!command) {
    return {
      score: 20,
      notes: ['missing install command'],
    }
  }

  if (/\b(curl|wget)\b.*\|\s*(sh|bash|zsh)/.test(command)) {
    penalty += 42
    notes.push('remote shell pipe install')
  }
  if (/\bsudo\b/.test(command)) {
    penalty += 26
    notes.push('requires sudo or elevated permissions')
  }
  if (/\brm\s+-rf\b|chmod\s+777|chown\s+-r/.test(command)) {
    penalty += 34
    notes.push('destructive or broad filesystem command')
  }
  if (/\b(eval|exec|powershell|bash\s+-c|sh\s+-c)\b/.test(command)) {
    penalty += 24
    notes.push('dynamic command execution')
  }
  if (/\b(token|secret|api[_-]?key|password)\b/.test(command)) {
    penalty += 24
    notes.push('credential-bearing install command')
  }
  if (/\b(npx|npm|pnpm|yarn|pip|uv|poetry|brew|docker)\b/.test(command)) {
    notes.push('standard package or runtime install path')
  }

  return {
    score: clampScore(92 - penalty),
    notes: notes.length ? notes : ['simple repository or package install path'],
  }
}

function getPermissionSurface(skill: SkillRecord) {
  const text = trustSignalText(skill)
  const notes: string[] = []
  let exposure = 0

  if (/\b(secret|token|credential|api key|oauth|env|environment variable|password)\b/.test(text)) {
    exposure += 26
    notes.push('secrets or environment access')
  }
  if (/\b(shell|exec|subprocess|powershell|bash|terminal|cli|command)\b/.test(text)) {
    exposure += 24
    notes.push('shell or command execution')
  }
  if (/\b(file|filesystem|workspace|repo|repository|pdf|csv|xlsx|document)\b/.test(text)) {
    exposure += 14
    notes.push('filesystem or document access')
  }
  if (/\b(fetch|http|api|crawl|scrape|browser|playwright|puppeteer|selenium|webhook|network)\b/.test(text)) {
    exposure += 14
    notes.push('network or browser access')
  }
  if (/\b(database|sql|postgres|mysql|sqlite|schema|migration)\b/.test(text)) {
    exposure += 12
    notes.push('database access')
  }

  return {
    score: clampScore(100 - Math.min(82, exposure)),
    notes: notes.length ? notes : ['no high-risk permission surface in public metadata'],
  }
}

function getDependencyRisk(skill: SkillRecord) {
  const text = trustSignalText(skill)

  let risk = 10
  const notes: string[] = []

  if (/\b(curl\s+\S+\s*\|\s*(sh|bash)|wget\s+\S+\s*\|\s*(sh|bash))\b/.test(text)) {
    risk += 32
    notes.push('shell pipe install pattern')
  }
  if (/\b(shell|exec|subprocess|powershell|bash|terminal|cli)\b/.test(text)) {
    risk += 18
    notes.push('command execution surface')
  }
  if (/\b(secret|token|credential|api key|oauth|env|environment variable)\b/.test(text)) {
    risk += 18
    notes.push('credential or environment access')
  }
  if (/\b(pip install|npm install|pnpm add|yarn add|docker|container)\b/.test(text)) {
    risk += 10
    notes.push('external package install surface')
  }
  if (/\b(browser|playwright|puppeteer|selenium|crawl|scrape|fetch|http|webhook|api)\b/.test(text)) {
    risk += 8
    notes.push('network or browser surface')
  }
  if (/\b(sql|database|postgres|mysql|sqlite|migration)\b/.test(text)) {
    risk += 8
    notes.push('database surface')
  }

  return {
    score: clampScore(100 - Math.min(85, risk)),
    notes: notes.length ? notes : ['no major dependency risk hints in public metadata'],
  }
}

function weightedScore(dimensions: SkillTrustDimension[]) {
  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0) || 1
  return clampScore(
    dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / totalWeight
  )
}

function buildTrustDimensions(
  skill: SkillRecord,
  freshnessDays: number | null,
  stars: number,
  qualityScore: number,
  outcomeEvidence: SkillTrustOutcomeEvidence
): SkillTrustDimension[] {
  const adoptionScore = scoreAdoption(stars)
  const repoActivityScore = clampScore(scoreAdoption(stars) * 0.62 + scoreForks(Number(skill.github_forks || 0)) * 0.38)
  const maintenanceScore = scoreMaintenance(freshnessDays)
  const documentationScore = scoreDocumentation(skill)
  const dependency = getDependencyRisk(skill)
  const installSafety = getInstallCommandSafety(skill)
  const permissionSurface = getPermissionSurface(skill)
  const installScore = hasInstallPath(skill) ? 92 : 24
  const repositoryScore = hasRepository(skill) ? 86 : 24
  const reviewScore =
    skill.ai_review_approved && (skill.ai_review_issues || []).length === 0
      ? 88
      : skill.ai_review_approved
        ? 66
        : 46
  const agentOutcomeScore = scoreAgentOutcomes(outcomeEvidence)

  return [
    {
      id: 'github_adoption',
      label: 'GitHub adoption',
      score: adoptionScore,
      weight: 0.13,
      status: statusForScore(adoptionScore),
      detail: `${formatCompactNumber(stars)} GitHub stars`,
    },
    {
      id: 'repo_activity',
      label: 'Stars/forks activity',
      score: repoActivityScore,
      weight: 0.08,
      status: statusForScore(repoActivityScore),
      detail: `${formatCompactNumber(stars)} stars, ${formatCompactNumber(skill.github_forks || 0)} forks; issue activity unavailable in current metadata`,
    },
    {
      id: 'maintenance',
      label: 'Recent maintenance',
      score: maintenanceScore,
      weight: 0.14,
      status: statusForScore(maintenanceScore),
      detail: getMaintenanceLabel(freshnessDays),
    },
    {
      id: 'license',
      label: 'License clarity',
      score: scoreLicense(skill),
      weight: 0.09,
      status: hasKnownLicense(skill) ? 'pass' : 'warn',
      detail: skill.license || 'Unknown license',
    },
    {
      id: 'documentation',
      label: 'README/SKILL.md completeness',
      score: documentationScore,
      weight: 0.14,
      status: statusForScore(documentationScore),
      detail:
        documentationScore >= 82
          ? 'Metadata includes enough usage and workflow context'
          : 'Public metadata needs stronger README/SKILL.md context',
    },
    {
      id: 'dependency_risk',
      label: 'Dependency/runtime risk',
      score: dependency.score,
      weight: 0.12,
      status: statusForScore(dependency.score),
      detail: dependency.notes.slice(0, 2).join(', '),
    },
    {
      id: 'installability',
      label: 'Install availability',
      score: installScore,
      weight: 0.1,
      status: hasInstallPath(skill) ? 'pass' : 'fail',
      detail: skill.install_command || skill.npm_package || skill.github_repo || 'Missing install command',
    },
    {
      id: 'install_safety',
      label: 'Install command safety',
      score: installSafety.score,
      weight: 0.1,
      status: statusForScore(installSafety.score),
      detail: installSafety.notes.slice(0, 2).join(', '),
    },
    {
      id: 'permission_surface',
      label: 'Permission surface',
      score: permissionSurface.score,
      weight: 0.07,
      status: statusForScore(permissionSurface.score),
      detail: permissionSurface.notes.slice(0, 2).join(', '),
    },
    {
      id: 'repository',
      label: 'Repository evidence',
      score: repositoryScore,
      weight: 0.04,
      status: hasRepository(skill) ? 'pass' : 'fail',
      detail: skill.repository || skill.github_repo || 'Missing repository link',
    },
    {
      id: 'review_status',
      label: 'Review status',
      score: Math.max(reviewScore, Math.min(qualityScore, 90)),
      weight: 0.05,
      status: statusForScore(reviewScore),
      detail: skill.ai_review_approved ? 'AI review data available' : 'AI review approval is missing',
    },
    {
      id: 'agent_outcomes',
      label: 'Agent Proven outcomes',
      score: agentOutcomeScore,
      weight: 0.13,
      status: outcomeEvidence.total > 0 ? statusForScore(agentOutcomeScore) : 'info',
      detail: outcomeEvidence.label,
    },
  ]
}

export function getSkillTrustProfile(
  skill: SkillRecord,
  hasApprovedClaim = false,
  eventStats?: SkillEventStats | null,
  outcomeStats?: TrustOutcomeStats
): SkillTrustProfile {
  const freshnessDays = getFreshnessDays(skill.github_last_pushed_at || skill.updated_at)
  const stars = Number(skill.github_stars || 0)
  const qualityScore = Number(skill.quality_score || skill.ai_review_score?.score || 0)
  const issues = Array.isArray(skill.ai_review_issues) ? skill.ai_review_issues : []
  const outcomeEvidence = getOutcomeEvidence(outcomeStats)
  const dimensions = buildTrustDimensions(skill, freshnessDays, stars, qualityScore, outcomeEvidence)
  const checks: SkillTrustCheck[] = []
  const strengths: string[] = []
  const warnings: string[] = []

  let score = weightedScore(dimensions)

  if (skill.verified) {
    score += 5
    strengths.push('Manually verified listing')
  }

  if (hasApprovedClaim) {
    score += 4
    strengths.push('Owner claim is approved')
  }

  if (skill.ai_review_approved) {
    strengths.push('AI review approved')
  } else {
    warnings.push('AI review approval is missing')
  }

  if (issues.length > 0) {
    score -= Math.min(8, issues.length * 3)
    warnings.push(issues[0])
  }

  if (hasInstallPath(skill)) strengths.push('Install path is available')
  else warnings.push('Install path is missing')

  if (hasRepository(skill)) strengths.push('Repository evidence is available')
  else warnings.push('Repository link is missing')

  if (!hasKnownLicense(skill)) warnings.push('License is unclear')

  if (freshnessDays === null) warnings.push('Repository freshness is unknown')
  else if (freshnessDays <= 90) strengths.push('Recently maintained repository')
  else if (freshnessDays > 365) warnings.push('Repository looks stale')

  if (stars >= 5000) strengths.push('Large GitHub adoption signal')
  else if (stars >= 500) strengths.push('Meaningful GitHub adoption signal')
  else if (stars < 50) warnings.push('Low GitHub adoption signal')

  if (qualityScore >= 85) strengths.push('High quality score')
  else if (qualityScore < 55) warnings.push('Quality score needs review')

  if (`${skill.long_description || ''} ${skill.description || ''}`.trim().length < 320) {
    warnings.push('Documentation summary is thin')
  }

  const installSafety = dimensions.find((dimension) => dimension.id === 'install_safety')
  if (installSafety && installSafety.score < 62) warnings.push(`Install command needs review: ${installSafety.detail}`)
  else if (installSafety) strengths.push('Install command has no obvious high-risk pattern')

  const permissionSurface = dimensions.find((dimension) => dimension.id === 'permission_surface')
  if (permissionSurface && permissionSurface.score < 62) warnings.push(`Permission surface needs review: ${permissionSurface.detail}`)

  if (eventStats && eventStats.total_events > 0) {
    const usageBoost = Math.min(4, Math.floor((eventStats.install_copies + eventStats.outbound_clicks) / 10))
    score += usageBoost
    if (eventStats.install_copies > 0 || eventStats.outbound_clicks > 0) {
      strengths.push('OpenAgentSkill usage activity detected')
    }
  }

  if (outcomeEvidence.total > 0) {
    const outcomeBoost =
      outcomeEvidence.successRate !== null && outcomeEvidence.successRate >= 80
        ? Math.min(5, Math.floor(outcomeEvidence.total / 2))
        : 0
    score += outcomeBoost
    if (outcomeEvidence.agentProvenScore >= 82) score += 3
    if (outcomeEvidence.agentProvenScore < 48 && outcomeEvidence.total >= 3) score -= 5
    strengths.push(`Agent Proven evidence available: ${outcomeEvidence.label}`)

    if (outcomeEvidence.successRate !== null && outcomeEvidence.successRate < 55 && outcomeEvidence.total >= 3) {
      score -= 6
      warnings.push(`Low reported agent success rate: ${outcomeEvidence.successRate}%`)
    }
    if (outcomeEvidence.recentFailureRate !== null && outcomeEvidence.recentFailureRate >= 45) {
      score -= 5
      warnings.push(`Recent failure rate is elevated: ${outcomeEvidence.recentFailureRate}%`)
    }
    if (outcomeEvidence.avgOutputQuality !== null && outcomeEvidence.avgOutputQuality <= 2.5) {
      score -= 4
      warnings.push(`Low reported output quality: ${outcomeEvidence.avgOutputQuality.toFixed(1)}/5`)
    }
    if (outcomeEvidence.productionOutcomes > 0) {
      strengths.push(`${outcomeEvidence.productionOutcomes} production outcome(s) reported`)
    }
    if (outcomeEvidence.riskBlocked > 0) warnings.push(`${outcomeEvidence.riskBlocked} agent outcome(s) blocked by risk`)
    if (outcomeEvidence.setupRequired > 0) warnings.push(`${outcomeEvidence.setupRequired} agent outcome(s) needed setup`)
    if (outcomeEvidence.notRelevant > 0) warnings.push(`${outcomeEvidence.notRelevant} agent outcome(s) reported not relevant`)
    if (outcomeEvidence.failures > 0) warnings.push(`${outcomeEvidence.failures} failed agent outcome(s) reported`)
    if (outcomeEvidence.humanReviewRequired > 0) warnings.push(`${outcomeEvidence.humanReviewRequired} agent outcome(s) required human review`)
  }

  for (const dimension of dimensions) {
    addCheck(checks, dimension.status, dimension.label, dimension.detail)
  }
  addCheck(
    checks,
    skill.verified || hasApprovedClaim ? 'pass' : 'warn',
    'Ownership',
    hasApprovedClaim
      ? 'Owner claim approved'
      : skill.verified
        ? 'Listing manually verified'
        : 'No approved owner claim yet'
  )
  addCheck(
    checks,
    eventStats && eventStats.total_events > 0 ? 'pass' : 'info',
    'OpenAgentSkill usage',
    eventStats && eventStats.total_events > 0
      ? `${formatCompactNumber(eventStats.views || 0)} views, ${formatCompactNumber(eventStats.install_copies || 0)} install copies`
      : 'No local usage activity yet'
  )
  addCheck(
    checks,
    outcomeEvidence.total > 0 ? statusForScore(scoreAgentOutcomes(outcomeEvidence)) : 'info',
    'Agent outcomes',
    outcomeEvidence.label
  )

  const finalScore = clampScore(score)
  const tier = getTier(finalScore)
  const dimensionWarnings = dimensions
    .filter((dimension) => dimension.status === 'warn' || dimension.status === 'fail')
    .map((dimension) => `${dimension.label}: ${dimension.detail}`)
  const finalWarnings = [...new Set([...warnings, ...dimensionWarnings])].slice(0, 10)
  const documentationDimension = dimensions.find((dimension) => dimension.id === 'documentation')
  const installCommand = getInstallCommand(skill)
  const policy = getInstallPolicy(finalScore, hasInstallPath(skill), hasRepository(skill), hasKnownLicense(skill))
  const outcomeAllowsAutoInstall =
    outcomeEvidence.total < 3 ||
    (
      outcomeEvidence.riskBlocked === 0 &&
      outcomeEvidence.notRelevant === 0 &&
      outcomeEvidence.humanReviewRequired === 0 &&
      (outcomeEvidence.successRate === null || outcomeEvidence.successRate >= 65) &&
      (outcomeEvidence.recentFailureRate === null || outcomeEvidence.recentFailureRate < 45)
    )
  const autoInstallAllowed = policy === 'agent_install_candidate' && outcomeAllowsAutoInstall

  return {
    version: 'trust-score-v4',
    score: finalScore,
    ...tier,
    dimensions,
    checks,
    strengths: [...new Set(strengths)].slice(0, 8),
    warnings: finalWarnings,
    evidence: {
      stars: `${formatCompactNumber(stars)} GitHub stars`,
      repoActivity: `${formatCompactNumber(stars)} stars, ${formatCompactNumber(skill.github_forks || 0)} forks`,
      lastPushed: getMaintenanceLabel(freshnessDays),
      license: skill.license || 'Unknown license',
      repository: skill.repository || skill.github_repo || 'Missing repository link',
      install: installCommand || 'Missing install command',
      installSafety: dimensions.find((dimension) => dimension.id === 'install_safety')?.detail || 'Install command safety unavailable',
      permissionSurface: dimensions.find((dimension) => dimension.id === 'permission_surface')?.detail || 'Permission surface unavailable',
      documentation: getDocumentationLabel(documentationDimension?.score || 0),
      agentOutcomes: outcomeEvidence.label,
    },
    installReadiness: {
      ready: hasInstallPath(skill),
      command: installCommand,
      policy,
      label: getInstallPolicyLabel(policy),
      notes: [
        hasInstallPath(skill) ? 'Install path is available' : 'Install path is missing',
        hasRepository(skill) ? 'Repository evidence is available' : 'Repository link is missing',
        hasKnownLicense(skill) ? 'License is declared' : 'License is unclear',
        outcomeEvidence.total > 0 ? `${outcomeEvidence.agentProvenLabel} (${outcomeEvidence.agentProvenScore}/100 Agent Proven)` : 'No Agent Proven outcome evidence yet',
        getMaintenanceLabel(freshnessDays),
      ],
    },
    agentCompatibility: getAgentCompatibility(skill),
    riskSummary: getRiskSummary(finalScore, finalWarnings),
    outcomeEvidence,
    autoInstall: {
      allowed: autoInstallAllowed,
      sandboxRequired: policy !== 'agent_install_candidate' || outcomeEvidence.total === 0,
      policy,
      reason: autoInstallAllowed
        ? 'Trust Score v4 allows sandbox-first agent installation after normal workspace review.'
        : outcomeAllowsAutoInstall
          ? 'Human review or sandbox validation is required before automatic installation.'
          : 'Recent agent outcomes require review before automatic installation.',
    },
    bestFor: getBestFor(skill),
    doNotUseFor: getDoNotUseFor(skill, policy, outcomeEvidence),
    knownRisks: finalWarnings.slice(0, 8),
  }
}

function getOutcomeConfidence(evidence: SkillTrustOutcomeEvidence) {
  if (evidence.total <= 0) return 0
  return Math.min(1, Number((Math.log10(evidence.total + 1) / 1.2).toFixed(2)))
}

function getV5Tier(
  score: number,
  base: SkillTrustProfile,
  outcomeConfidence: number
): Pick<SkillTrustProfileV5, 'tier' | 'label' | 'summary' | 'recommendedAction'> {
  if (score >= 88 && base.autoInstall.allowed && outcomeConfidence >= 0.45) {
    return {
      tier: 'production',
      label: 'Agent-ready candidate',
      summary:
        'Strong Trust Score v5 with enough repository, install, risk, and outcome-loop evidence for a sandbox-first agent handoff.',
      recommendedAction: 'Allow sandbox-first agent installation, run one narrow task, then report the outcome.',
    }
  }

  if (score >= 76) {
    return {
      tier: 'strong',
      label: 'Review then install',
      summary:
        'Good shortlist signal, but the agent should review audit notes, install policy, and outcome evidence before running it.',
      recommendedAction: 'Use as the primary candidate after human or sandbox review.',
    }
  }

  if (score >= 60) {
    return {
      tier: 'review',
      label: 'Sandbox only',
      summary:
        'Useful candidate with missing or mixed trust signals. Keep it in an isolated workspace until the outcome loop proves task fit.',
      recommendedAction: 'Run only in a sandbox and compare close alternatives before using it for real work.',
    }
  }

  return {
    tier: 'risk',
    label: 'Do not auto-install',
    summary:
      'Trust Score v5 found insufficient evidence for agent installation. Treat this as discovery material, not an executable recommendation.',
    recommendedAction: 'Choose a stronger alternative or inspect the source manually before any install attempt.',
  }
}

function buildV5Decision(
  score: number,
  base: SkillTrustProfile,
  outcomeConfidence: number
): SkillTrustV5Decision {
  const outcome = base.outcomeEvidence
  const enoughOutcomeEvidence = outcome.total >= 3 || outcomeConfidence >= 0.5
  const healthyOutcomeEvidence =
    outcome.total === 0 ||
    (
      outcome.riskBlocked === 0 &&
      outcome.notRelevant === 0 &&
      outcome.humanReviewRequired === 0 &&
      (outcome.successRate === null || outcome.successRate >= 68) &&
      (outcome.recentFailureRate === null || outcome.recentFailureRate < 38)
    )
  const autoInstallAllowed =
    score >= 88 &&
    base.autoInstall.allowed &&
    enoughOutcomeEvidence &&
    healthyOutcomeEvidence &&
    base.riskSummary.level === 'low'
  const humanReviewRequired =
    !autoInstallAllowed ||
    base.installReadiness.policy !== 'agent_install_candidate' ||
    base.riskSummary.level !== 'low' ||
    outcome.humanReviewRequired > 0

  const reasoning = [
    `${score}/100 Trust Score v5`,
    `${base.score}/100 Trust Score v4 baseline`,
    enoughOutcomeEvidence
      ? `${outcome.label}; outcome confidence ${Math.round(outcomeConfidence * 100)}%`
      : 'Needs more real agent outcomes before unattended install',
    base.installReadiness.ready ? 'Install path is available' : 'Install path is missing',
    base.riskSummary.label,
  ]

  return {
    install_policy: autoInstallAllowed ? 'agent_install_candidate' : base.installReadiness.policy,
    auto_install_allowed: autoInstallAllowed,
    human_review_required: humanReviewRequired,
    sandbox_first: true,
    agent_action: autoInstallAllowed
      ? 'Install in a sandbox, run one narrow task, then report outcome.'
      : score >= 76
        ? 'Ask for approval or run a sandbox-only trial before installing.'
        : 'Compare alternatives before installing.',
    reasoning,
    review_required_when: [
      'The workspace contains production secrets, payments, private customer data, or irreversible actions.',
      'The install command requests shell, network, credential, database, or broad filesystem access.',
      'Outcome evidence is missing, recently failed, or required human review.',
      ...base.doNotUseFor.slice(0, 3),
    ].filter((item, index, items) => items.indexOf(item) === index),
  }
}

function buildV5OutcomeLoop(): SkillTrustV5OutcomeLoop {
  return {
    version: 'openagentskill-agent-outcome-v3',
    required_after_install: true,
    endpoint: '/api/agent/outcome',
    method: 'POST',
    event_id_source: 'feedback.event_id, install_receipt.resolve_event_id, or decision_packet.outcome_feedback.event_id',
    expected_outcomes: ['success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required'],
    required_fields: ['event_id', 'skill_slug', 'task'],
    quality_fields: [
      'task_success',
      'output_quality',
      'error_type',
      'human_review_required',
      'used_in_production',
      'workspace',
      'evidence_url',
      'time_to_useful_ms',
    ],
    ranking_inputs_updated: [
      'Trust Score v5 outcome confidence',
      'Agent Proven Score',
      'Resolve ranking task-fit evidence',
      'Skill detail machine-readable metadata',
      'Outcome leaderboard',
    ],
  }
}

export function getSkillTrustProfileV5(
  skill: SkillRecord,
  hasApprovedClaim = false,
  eventStats?: SkillEventStats | null,
  outcomeStats?: TrustOutcomeStats
): SkillTrustProfileV5 {
  const base = getSkillTrustProfile(skill, hasApprovedClaim, eventStats, outcomeStats)
  const outcomeConfidence = getOutcomeConfidence(base.outcomeEvidence)
  const outcomeScore = scoreAgentOutcomes(base.outcomeEvidence)
  const outcomeWeight = base.outcomeEvidence.total > 0 ? 0.18 + outcomeConfidence * 0.2 : 0.08
  let score = base.outcomeEvidence.total > 0
    ? base.score * (1 - outcomeWeight) + outcomeScore * outcomeWeight
    : base.score - 3

  if (base.installReadiness.policy !== 'agent_install_candidate') score -= 2
  if (base.riskSummary.level === 'high') score -= 7
  else if (base.riskSummary.level === 'medium') score -= 3
  if (base.outcomeEvidence.total > 0 && base.outcomeEvidence.recentFailureRate !== null && base.outcomeEvidence.recentFailureRate >= 38) score -= 5
  if (base.outcomeEvidence.riskBlocked > 0) score -= Math.min(8, base.outcomeEvidence.riskBlocked * 2)
  if (base.outcomeEvidence.notRelevant > 0) score -= Math.min(6, base.outcomeEvidence.notRelevant * 2)
  if (base.outcomeEvidence.productionOutcomes > 0 && base.outcomeEvidence.successRate !== null && base.outcomeEvidence.successRate >= 75) score += 3

  const finalScore = clampScore(score)
  const tier = getV5Tier(finalScore, base, outcomeConfidence)
  const decision = buildV5Decision(finalScore, base, outcomeConfidence)
  const outcomeLoop = buildV5OutcomeLoop()
  const installCommand = base.installReadiness.command

  return {
    version: 'trust-score-v5',
    score: finalScore,
    base_score: base.score,
    outcome_confidence: outcomeConfidence,
    ...tier,
    decision,
    dimensions: base.dimensions,
    checks: base.checks,
    strengths: [
      ...base.strengths,
      base.outcomeEvidence.total > 0
        ? `Outcome confidence ${Math.round(outcomeConfidence * 100)}% from ${formatCompactNumber(base.outcomeEvidence.total)} report(s)`
        : 'Outcome loop is ready but needs first real agent run',
    ].filter((item, index, items) => items.indexOf(item) === index).slice(0, 10),
    warnings: [
      ...base.warnings,
      ...(base.outcomeEvidence.total === 0 ? ['No real agent outcome reports yet'] : []),
      ...(decision.human_review_required ? ['Human review required before unattended installation'] : []),
    ].filter((item, index, items) => items.indexOf(item) === index).slice(0, 12),
    evidence: {
      ...base.evidence,
      agentProvenScore: base.outcomeEvidence.agentProvenScore,
      outcomeConfidence: `${Math.round(outcomeConfidence * 100)}%`,
      installPolicy: decision.install_policy,
    },
    installReadiness: {
      ...base.installReadiness,
      policy: decision.install_policy,
      label: getInstallPolicyLabel(decision.install_policy),
      notes: [
        ...base.installReadiness.notes,
        decision.auto_install_allowed
          ? 'Trust Score v5 allows sandbox-first agent installation.'
          : 'Trust Score v5 requires review or sandbox-only use before install.',
      ].filter((item, index, items) => items.indexOf(item) === index),
    },
    agentCompatibility: base.agentCompatibility,
    riskSummary: base.riskSummary,
    outcomeEvidence: base.outcomeEvidence,
    autoInstall: {
      ...base.autoInstall,
      allowed: decision.auto_install_allowed,
      sandboxRequired: true,
      policy: decision.install_policy,
      reason: decision.agent_action,
    },
    outcome_loop: outcomeLoop,
    agent_contract: {
      suited_tasks: base.bestFor,
      suited_agents: base.agentCompatibility,
      install_command: installCommand,
      trust_score: finalScore,
      trust_version: 'trust-score-v5',
      risk_level: base.riskSummary.level,
      do_not_use_when: base.doNotUseFor,
      before_install: [
        'Read the audit page and machine-readable metadata.',
        'Confirm the install command, license, and permission surface fit the workspace.',
        decision.auto_install_allowed
          ? 'Install in a sandbox or branch before production use.'
          : 'Get explicit human approval or choose an alternative before installing.',
      ],
      after_run: [
        'Report the outcome to /api/agent/outcome using the resolve event id.',
        'Include output_quality, workspace, human_review_required, and evidence_url when available.',
        'Re-resolve before broad production rollout.',
      ],
    },
    bestFor: base.bestFor,
    doNotUseFor: base.doNotUseFor,
    knownRisks: base.knownRisks,
    backward_compatible: {
      trust_score_v4: {
        version: base.version,
        score: base.score,
        tier: base.tier,
        label: base.label,
        summary: base.summary,
      },
    },
  }
}
