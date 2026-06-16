import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import type { SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { getPrimaryInstallCommand, getSkillInstallTargets } from '@/lib/install-targets'
import { formatCompactNumber, getFreshnessDays, getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'

export interface SupplyTrackDefinition {
  slug: string
  label: string
  shortLabel: string
  description: string
  categoryAliases: string[]
  useCaseSlugs: string[]
  keywords: string[]
}

export interface SkillSupplyProfile {
  track: Pick<SupplyTrackDefinition, 'slug' | 'label' | 'shortLabel' | 'description'>
  scenario: {
    label: string
    description: string
    useCases: Array<{ slug: string; title: string }>
  }
  applicableAgents: string[]
  install: {
    ready: boolean
    command: string
    primaryTarget: string
    targetCount: number
  }
  githubQuality: {
    stars: number
    starsLabel: string
    forks: number
    license: string
    qualityScore: number
    trustScore: number
    auditScore: number
  }
  maintenance: {
    status: 'fresh' | 'active' | 'stable' | 'stale' | 'unknown'
    label: string
    daysSincePush: number | null
    lastPushedAt: string | null
  }
  risk: {
    level: 'safe_to_try' | 'needs_review' | 'risky'
    label: string
    requiresReview: boolean
    notes: string[]
  }
  coverageTags: string[]
}

export interface SupplyTrackSummary extends Pick<SupplyTrackDefinition, 'slug' | 'label' | 'shortLabel' | 'description'> {
  count: number
  highQualityCount: number
  maintainedCount: number
  href: string
}

export const SUPPLY_TRACKS: SupplyTrackDefinition[] = [
  {
    slug: 'coding',
    label: 'Coding and developer agents',
    shortLabel: 'Coding',
    description: 'Code review, repo analysis, testing, CI, GitHub, DevOps, and developer workflow skills.',
    categoryAliases: ['development', 'coding-agents', 'github-automation', 'testing-qa', 'devops', 'agent-frameworks'],
    useCaseSlugs: ['coding-agents', 'github-automation', 'testing-qa', 'database-sql'],
    keywords: ['code', 'coding', 'developer', 'github', 'pull request', 'repository', 'test', 'debug', 'ci', 'devops'],
  },
  {
    slug: 'research',
    label: 'Research and knowledge work',
    shortLabel: 'Research',
    description: 'Deep research, source comparison, literature review, RAG, knowledge search, and reports.',
    categoryAliases: ['research', 'rag-knowledge', 'document-processing'],
    useCaseSlugs: ['research-agents', 'rag-knowledge', 'document-processing'],
    keywords: ['research', 'analysis', 'rag', 'knowledge', 'paper', 'arxiv', 'summarize', 'source', 'report'],
  },
  {
    slug: 'finance',
    label: 'Finance and quant workflows',
    shortLabel: 'Finance',
    description: 'Market data, SEC filings, portfolio analysis, quant research, backtesting, and risk workflows.',
    categoryAliases: ['finance', 'finance-quant', 'web3-analytics'],
    useCaseSlugs: ['finance-quant'],
    keywords: ['finance', 'financial', 'quant', 'trading', 'portfolio', 'stock', 'market', 'sec', 'filings', 'risk'],
  },
  {
    slug: 'marketing',
    label: 'Marketing and growth automation',
    shortLabel: 'Marketing',
    description: 'SEO, content operations, lead generation, CRM, email automation, analytics, and growth workflows.',
    categoryAliases: ['growth-marketing', 'growth-automation', 'commerce-automation', 'content-automation', 'sales-crm'],
    useCaseSlugs: ['marketing-growth', 'content-automation', 'sales-crm', 'email-calendar'],
    keywords: ['marketing', 'seo', 'keyword', 'content', 'lead', 'crm', 'sales', 'email', 'analytics', 'growth'],
  },
  {
    slug: 'design',
    label: 'Design and creative production',
    shortLabel: 'Design',
    description: 'Design assets, images, video, audio, multimodal media, presentation, and creative production skills.',
    categoryAliases: ['design-creative', 'media-automation', 'multimodal-media', 'ml-automation'],
    useCaseSlugs: ['design-creative', 'multimodal-media'],
    keywords: ['design', 'creative', 'image', 'video', 'audio', 'media', 'presentation', 'figma', 'sprite', 'visual'],
  },
  {
    slug: 'data',
    label: 'Data, BI, and analytics',
    shortLabel: 'Data',
    description: 'CSV, SQL, notebooks, dashboards, data pipelines, BI, ETL, and spreadsheet analysis.',
    categoryAliases: ['data', 'data-analysis', 'database-sql', 'geo-science'],
    useCaseSlugs: ['data-analysis', 'database-sql'],
    keywords: ['data', 'analytics', 'sql', 'csv', 'spreadsheet', 'dashboard', 'etl', 'pipeline', 'notebook', 'bi'],
  },
  {
    slug: 'legal',
    label: 'Legal, policy, and compliance',
    shortLabel: 'Legal',
    description: 'Contract analysis, privacy, policy review, compliance checks, governance, and document risk review.',
    categoryAliases: ['legal-compliance'],
    useCaseSlugs: ['legal-compliance', 'security-compliance', 'document-processing'],
    keywords: ['legal', 'contract', 'policy', 'privacy', 'gdpr', 'compliance', 'governance', 'risk review'],
  },
  {
    slug: 'education',
    label: 'Education and tutoring',
    shortLabel: 'Education',
    description: 'Tutoring, course generation, quizzes, learning analytics, classrooms, and teaching workflows.',
    categoryAliases: ['education'],
    useCaseSlugs: ['education-tutoring', 'content-automation'],
    keywords: ['education', 'tutor', 'teaching', 'course', 'quiz', 'learning', 'classroom', 'student'],
  },
  {
    slug: 'football-world-cup',
    label: 'Football and World Cup analytics',
    shortLabel: 'World Cup',
    description: 'Football data, World Cup dashboards, xG, match prediction, scouting, and sports analytics.',
    categoryAliases: ['sports-analytics'],
    useCaseSlugs: ['sports-analytics'],
    keywords: ['football', 'soccer', 'world cup', 'fifa', 'sports', 'xg', 'match', 'player', 'team', 'statsbomb'],
  },
]

const FALLBACK_TRACK: SupplyTrackDefinition = {
  slug: 'automation',
  label: 'General agent automation',
  shortLabel: 'Automation',
  description: 'Reusable skills for broad agent workflows, productivity, local tools, and task automation.',
  categoryAliases: ['automation', 'productivity', 'productivity-automation', 'support-automation', 'utility', 'security'],
  useCaseSlugs: ['workflow-automation', 'local-desktop', 'customer-support', 'security-compliance'],
  keywords: ['automation', 'workflow', 'productivity', 'support', 'security', 'desktop', 'task', 'agent'],
}

function skillSearchText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function trackScore(skill: SkillRecord, track: SupplyTrackDefinition) {
  const text = skillSearchText(skill)
  const category = (skill.category || '').toLowerCase()
  const useCases = getUseCasesForSkill(skill, 6).map((useCase) => useCase.slug)
  let score = 0

  if (track.categoryAliases.some((alias) => alias.toLowerCase() === category)) score += 24
  if (track.categoryAliases.some((alias) => text.includes(alias.toLowerCase().replace(/-/g, ' ')))) score += 8
  for (const slug of useCases) {
    if (track.useCaseSlugs.includes(slug)) score += 16
  }
  for (const keyword of track.keywords) {
    if (text.includes(keyword.toLowerCase())) score += keyword.includes(' ') ? 7 : 4
  }

  return score
}

export function getSupplyTrackForSkill(skill: SkillRecord) {
  const ranked = SUPPLY_TRACKS
    .map((track) => ({ track, score: trackScore(skill, track) }))
    .sort((a, b) => b.score - a.score)

  if (ranked[0] && ranked[0].score > 0) return ranked[0].track
  return FALLBACK_TRACK
}

function getMaintenanceStatus(days: number | null): SkillSupplyProfile['maintenance']['status'] {
  if (days === null) return 'unknown'
  if (days <= 30) return 'fresh'
  if (days <= 180) return 'active'
  if (days <= 365) return 'stable'
  return 'stale'
}

function getMaintenanceLabel(days: number | null) {
  if (days === null) return 'Unknown maintenance'
  if (days === 0) return 'Pushed today'
  if (days <= 30) return `${days}d since push`
  if (days < 365) return `${Math.round(days / 30)}mo since push`
  return `${Math.round(days / 365)}y since push`
}

function unique(values: string[], limit: number) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
    if (result.length >= limit) break
  }
  return result
}

export function getSkillSupplyProfile(skill: SkillRecord, eventStats?: SkillEventStats | null): SkillSupplyProfile {
  const track = getSupplyTrackForSkill(skill)
  const useCases = getUseCasesForSkill(skill, 6)
  const quality = getSkillQualityProfile(skill)
  const trust = getSkillTrustProfile(skill, false, eventStats || null)
  const audit = buildSkillAudit(skill, eventStats || null)
  const installTargets = getSkillInstallTargets(skill)
  const platformHints = getPlatformHints(skill)
  const freshnessDays = getFreshnessDays(skill.github_last_pushed_at || skill.updated_at)
  const maintenanceStatus = getMaintenanceStatus(freshnessDays)
  const primaryUseCase = useCases.find((useCase) => track.useCaseSlugs.includes(useCase.slug)) || useCases[0]
  const command = getPrimaryInstallCommand(skill)
  const notes = unique(
    [
      ...audit.warnings,
      ...trust.warnings,
      ...quality.warnings,
      audit.risk_level === 'safe_to_try' ? '' : auditRiskLabel(audit.risk_level),
    ],
    5
  )

  return {
    track: {
      slug: track.slug,
      label: track.label,
      shortLabel: track.shortLabel,
      description: track.description,
    },
    scenario: {
      label: primaryUseCase ? primaryUseCase.shortTitle : track.shortLabel,
      description: primaryUseCase?.heroPrompt || track.description,
      useCases: useCases.slice(0, 3).map((useCase) => ({ slug: useCase.slug, title: useCase.shortTitle })),
    },
    applicableAgents: unique(
      [
        ...platformHints,
        ...installTargets.map((target) => target.label),
        ...(skill.frameworks || []),
        'Codex',
        'Claude Code',
        'Cursor',
      ],
      5
    ),
    install: {
      ready: Boolean(skill.install_command || skill.github_repo || skill.repository),
      command,
      primaryTarget: installTargets[0]?.label || 'CLI',
      targetCount: installTargets.length,
    },
    githubQuality: {
      stars: Number(skill.github_stars || 0),
      starsLabel: formatCompactNumber(Number(skill.github_stars || 0)),
      forks: Number(skill.github_forks || 0),
      license: skill.license || 'Unknown',
      qualityScore: quality.score,
      trustScore: trust.score,
      auditScore: audit.audit_score,
    },
    maintenance: {
      status: maintenanceStatus,
      label: getMaintenanceLabel(freshnessDays),
      daysSincePush: freshnessDays,
      lastPushedAt: skill.github_last_pushed_at || skill.updated_at || null,
    },
    risk: {
      level: audit.risk_level,
      label: auditRiskLabel(audit.risk_level),
      requiresReview: audit.risk_level !== 'safe_to_try' || notes.length > 0,
      notes: notes.length > 0 ? notes : ['No major risk signals from available metadata'],
    },
    coverageTags: unique(
      [
        track.shortLabel,
        primaryUseCase?.shortTitle,
        skill.category,
        ...(skill.tags || []),
        ...(skill.frameworks || []),
      ].filter((value): value is string => Boolean(value)),
      8
    ),
  }
}

export function getSupplyTrackSummaries(profiles: SkillSupplyProfile[]): SupplyTrackSummary[] {
  return SUPPLY_TRACKS.map((track) => {
    const matched = profiles.filter((profile) => profile.track.slug === track.slug)
    return {
      slug: track.slug,
      label: track.label,
      shortLabel: track.shortLabel,
      description: track.description,
      count: matched.length,
      highQualityCount: matched.filter((profile) => profile.githubQuality.qualityScore >= 70 || profile.githubQuality.trustScore >= 72).length,
      maintainedCount: matched.filter((profile) => profile.maintenance.status === 'fresh' || profile.maintenance.status === 'active').length,
      href: `/skills?track=${track.slug}`,
    }
  })
}
