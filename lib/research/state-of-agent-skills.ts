import { unstable_cache } from 'next/cache'
import {
  getAgentOutcomeStatsMap,
  getAllSkills,
  getApprovedSkillSitemapCount,
  type SkillOutcomeStats,
  type SkillRecord,
} from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { evaluateSkillLikeness, stripGeneratedSkillBoilerplate } from '@/lib/skill-likeness'
import { getSkillSupplyProfile } from '@/lib/supply'

const REPORT_ID = 'state-of-agent-skills-2026'
const REPORT_SAMPLE_SIZE = 1_000
const REPORT_PUBLISHED_AT = '2026-07-10T00:00:00.000Z'

export interface StateOfAgentSkillsRow {
  slug: string
  name: string
  repository: string
  category: string
  track: string
  trackLabel: string
  stars: number
  forks: number
  license: string
  lastPushedAt: string | null
  installReady: boolean
  qualityScore: number
  trustScore: number
  auditScore: number
  riskLevel: string
  skillLikenessScore: number
  skillLikenessTier: string
  classification: 'agent-skill' | 'agent-workflow' | 'domain-tool' | 'collection' | 'generic'
  agentOutcomeCount: number
  agentSuccessRate: number | null
  canonicalUrl: string
}

export interface StateOfAgentSkillsTrackRow {
  slug: string
  label: string
  count: number
  share: number
  maintainedCount: number
  knownLicenseCount: number
  highTrustCount: number
}

export interface StateOfAgentSkillsReport {
  id: string
  title: string
  publishedAt: string
  generatedAt: string
  canonicalUrl: string
  datasetUrls: {
    json: string
    csv: string
    text: string
  }
  methodology: {
    indexedPopulation: string
    analyzedSample: string
    inclusionRules: string[]
    limitations: string[]
  }
  metrics: {
    indexedCandidates: number
    analyzedCandidates: number
    workflowSpecificCandidates: number
    skillSpecificCandidates: number
    agentWorkflowCandidates: number
    domainToolCandidates: number
    collectionCandidates: number
    genericCandidates: number
    maintainedCandidates: number
    knownLicenseCandidates: number
    installReadyCandidates: number
    highAdoptionCandidates: number
    highTrustCandidates: number
    safeToTryCandidates: number
    needsReviewCandidates: number
    riskyCandidates: number
    agentProvenSkills: number
    totalAgentOutcomes: number
  }
  tracks: StateOfAgentSkillsTrackRow[]
  topSkills: StateOfAgentSkillsRow[]
  skills: StateOfAgentSkillsRow[]
  findings: string[]
}

function isKnownLicense(value: string | null | undefined) {
  const normalized = (value || '').trim().toLowerCase()
  return Boolean(normalized && !['unknown', 'none', 'n/a', 'unlicensed'].includes(normalized))
}

function daysSince(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
}

function rate(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((count / total) * 1_000) / 10
}

function outcomeFor(
  outcomeStatsMap: Record<string, SkillOutcomeStats>,
  slug: string
) {
  return outcomeStatsMap[slug] || null
}

function hasStrictSkillEvidence(skill: SkillRecord) {
  const repositoryName = (skill.github_repo || skill.repository || '').split('/').pop() || ''
  const sourceText = [
    skill.name,
    repositoryName,
    stripGeneratedSkillBoilerplate(skill.description),
    stripGeneratedSkillBoilerplate(skill.long_description),
    stripGeneratedSkillBoilerplate(skill.tagline),
    ...(skill.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    /\b(skill\.md|agent[-_\s]?skills?|ai[-_\s]?agent[-_\s]?skills?|claude[-_\s]?skills?|codex[-_\s]?skills?|cursor[-_\s]?skills?)\b/i.test(sourceText) ||
    /(^|[-_])skills?$/i.test(repositoryName) ||
    /\bskills?$/i.test(skill.name.trim()) ||
    (skill.tags || []).some((tag) => /^(agent-skills?|ai-agent-skills?|claude-skills?|codex-skills?)$/i.test(tag))
  )
}

function isCollectionRecord(skill: SkillRecord) {
  const repositoryName = (skill.github_repo || skill.repository || '').split('/').pop() || ''
  const text = [
    skill.name,
    repositoryName,
    stripGeneratedSkillBoilerplate(skill.description),
    stripGeneratedSkillBoilerplate(skill.tagline),
  ]
    .filter(Boolean)
    .join(' ')

  return /(^|[-_\s])awesome[-_\s]|\bcurated\s+(list|collection)|\bcollection of\b/i.test(text)
}

function reportClassification(skill: SkillRecord, likenessTier: string): StateOfAgentSkillsRow['classification'] {
  if (isCollectionRecord(skill)) return 'collection'
  if (hasStrictSkillEvidence(skill)) return 'agent-skill'
  if (likenessTier === 'agent-workflow') return 'agent-workflow'
  if (likenessTier === 'domain-workflow' || likenessTier === 'ecosystem') return 'domain-tool'
  return 'generic'
}

function toReportRow(
  skill: SkillRecord,
  outcomeStatsMap: Record<string, SkillOutcomeStats>
): StateOfAgentSkillsRow {
  const supply = getSkillSupplyProfile(skill)
  const likeness = evaluateSkillLikeness({
    fullName: skill.github_repo,
    name: skill.name,
    description: skill.description,
    longDescription: skill.long_description,
    tagline: skill.tagline,
    tags: skill.tags,
    frameworks: skill.frameworks,
    language: skill.github_language,
    category: skill.category,
    stars: skill.github_stars,
  })
  const outcomes = outcomeFor(outcomeStatsMap, skill.slug)
  const classification = reportClassification(skill, likeness.tier)

  return {
    slug: skill.slug,
    name: skill.name,
    repository: skill.github_repo || skill.repository,
    category: skill.category,
    track: supply.track.slug,
    trackLabel: supply.track.label,
    stars: Number(skill.github_stars || 0),
    forks: Number(skill.github_forks || 0),
    license: skill.license || 'Unknown',
    lastPushedAt: skill.github_last_pushed_at || skill.updated_at || null,
    installReady: supply.install.ready,
    qualityScore: supply.githubQuality.qualityScore,
    trustScore: supply.githubQuality.trustScore,
    auditScore: supply.githubQuality.auditScore,
    riskLevel: supply.risk.level,
    skillLikenessScore: likeness.score,
    skillLikenessTier: likeness.tier,
    classification,
    agentOutcomeCount: Number(outcomes?.total_outcomes || 0),
    agentSuccessRate: outcomes?.success_rate == null ? null : Number(outcomes.success_rate),
    canonicalUrl: `https://www.openagentskill.com/skills/${skill.slug}`,
  }
}

function buildTrackRows(rows: StateOfAgentSkillsRow[]) {
  const tracks = new Map<string, StateOfAgentSkillsTrackRow>()

  for (const row of rows) {
    const current = tracks.get(row.track) || {
      slug: row.track,
      label: row.trackLabel,
      count: 0,
      share: 0,
      maintainedCount: 0,
      knownLicenseCount: 0,
      highTrustCount: 0,
    }

    current.count += 1
    if ((daysSince(row.lastPushedAt) ?? Number.POSITIVE_INFINITY) <= 180) current.maintainedCount += 1
    if (isKnownLicense(row.license)) current.knownLicenseCount += 1
    if (row.trustScore >= 72) current.highTrustCount += 1
    tracks.set(row.track, current)
  }

  return [...tracks.values()]
    .map((track) => ({
      ...track,
      share: rate(track.count, rows.length),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function buildReport(
  skills: SkillRecord[],
  indexedCandidates: number,
  outcomeStatsMap: Record<string, SkillOutcomeStats>
): StateOfAgentSkillsReport {
  const generatedAt = new Date().toISOString()
  const rows = skills.map((skill) => toReportRow(skill, outcomeStatsMap))
  const workflowSpecificRows = rows.filter(
    (row) => row.classification !== 'generic' && row.classification !== 'collection'
  )
  const skillSpecificRows = rows.filter((row) => row.classification === 'agent-skill')
  const agentWorkflowRows = rows.filter((row) => row.classification === 'agent-workflow')
  const domainToolRows = rows.filter((row) => row.classification === 'domain-tool')
  const collectionRows = rows.filter((row) => row.classification === 'collection')
  const maintainedCandidates = rows.filter(
    (row) => (daysSince(row.lastPushedAt) ?? Number.POSITIVE_INFINITY) <= 180
  ).length
  const knownLicenseCandidates = rows.filter((row) => isKnownLicense(row.license)).length
  const installReadyCandidates = rows.filter((row) => row.installReady).length
  const highAdoptionCandidates = rows.filter((row) => row.stars >= 500).length
  const highTrustCandidates = rows.filter((row) => row.trustScore >= 72).length
  const safeToTryCandidates = rows.filter((row) => row.riskLevel === 'safe_to_try').length
  const needsReviewCandidates = rows.filter((row) => row.riskLevel === 'needs_review').length
  const riskyCandidates = rows.filter((row) => row.riskLevel === 'risky').length
  const agentProvenSkills = rows.filter((row) => row.agentOutcomeCount > 0).length
  const totalAgentOutcomes = rows.reduce((sum, row) => sum + row.agentOutcomeCount, 0)
  const canonicalUrl = 'https://www.openagentskill.com/reports/state-of-agent-skills-2026'

  const topSkills = rows
    .filter(
      (row) =>
        row.classification === 'agent-skill' ||
        row.agentOutcomeCount > 0
    )
    .filter((row) => row.stars >= 10)
    .sort((a, b) => {
      const outcomeDelta = Math.min(5, b.agentOutcomeCount) - Math.min(5, a.agentOutcomeCount)
      if (outcomeDelta !== 0) return outcomeDelta
      const trustDelta = b.trustScore - a.trustScore
      if (trustDelta !== 0) return trustDelta
      const likenessDelta = b.skillLikenessScore - a.skillLikenessScore
      if (likenessDelta !== 0) return likenessDelta
      return b.stars - a.stars
    })
    .slice(0, 25)

  return {
    id: REPORT_ID,
    title: 'State of Agent Skills 2026',
    publishedAt: REPORT_PUBLISHED_AT,
    generatedAt,
    canonicalUrl,
    datasetUrls: {
      json: `${canonicalUrl}.json`,
      csv: `${canonicalUrl}.csv`,
      text: `${canonicalUrl}.txt`,
    },
    methodology: {
      indexedPopulation:
        'All public records with ai_review_approved=true in the OpenAgentSkill registry. MCP-only records are excluded by the registry read layer.',
      analyzedSample: `The highest-ranked ${rows.length.toLocaleString()} approved candidates by the current quality ordering. The sample is a product audit, not a random statistical sample.`,
      inclusionRules: [
        'Public GitHub repository or repository URL is available',
        'Registry AI review is approved',
        'MCP-only server records are excluded',
        'Skill-likeness is measured separately from repository popularity',
        'Trust and audit scores use public repository metadata and declared install information',
      ],
      limitations: [
        'GitHub stars measure repository adoption, not agent task success',
        'Candidate listings are not equivalent to verified maintainer claims',
        'A public metadata audit is not a substitute for source review or sandbox execution',
        'Agent Proven evidence remains sparse until agents report real outcomes',
        'Repository metadata can change after this report is generated',
      ],
    },
    metrics: {
      indexedCandidates,
      analyzedCandidates: rows.length,
      workflowSpecificCandidates: workflowSpecificRows.length,
      skillSpecificCandidates: skillSpecificRows.length,
      agentWorkflowCandidates: agentWorkflowRows.length,
      domainToolCandidates: domainToolRows.length,
      collectionCandidates: collectionRows.length,
      genericCandidates: rows.filter((row) => row.classification === 'generic').length,
      maintainedCandidates,
      knownLicenseCandidates,
      installReadyCandidates,
      highAdoptionCandidates,
      highTrustCandidates,
      safeToTryCandidates,
      needsReviewCandidates,
      riskyCandidates,
      agentProvenSkills,
      totalAgentOutcomes,
    },
    tracks: buildTrackRows(rows),
    topSkills,
    skills: rows,
    findings: [
      `${rate(skillSpecificRows.length, rows.length)}% of the analyzed sample has strict Agent Skill evidence in its repository name, README, description, or topics.`,
      `${rate(agentWorkflowRows.length, rows.length)}% describes an agent workflow or agent product without strict reusable-skill evidence.`,
      `${rate(domainToolRows.length, rows.length)}% is better described as a domain workflow tool or ecosystem dependency than a strict agent skill.`,
      `${rate(collectionRows.length, rows.length)}% is a list or collection rather than one installable skill.`,
      `${rate(maintainedCandidates, rows.length)}% was pushed within 180 days of report generation.`,
      `${rate(knownLicenseCandidates, rows.length)}% has a declared license that is not marked unknown.`,
      `${rate(highTrustCandidates, rows.length)}% reaches the current 72-point high-trust threshold in this quality-ranked sample; Trust remains a metadata signal, not proof of task success.`,
      `${agentProvenSkills.toLocaleString()} analyzed ${agentProvenSkills === 1 ? 'skill has' : 'skills have'} at least one reported agent outcome, covering ${totalAgentOutcomes.toLocaleString()} ${totalAgentOutcomes === 1 ? 'outcome' : 'outcomes'} in total.`,
    ],
  }
}

const getCachedReport = unstable_cache(
  async () => {
    const [skillsResult, countResult, outcomesResult] = await Promise.allSettled([
      getAllSkills('quality', undefined, REPORT_SAMPLE_SIZE),
      getApprovedSkillSitemapCount(),
      getAgentOutcomeStatsMap(),
    ])

    const skills =
      skillsResult.status === 'fulfilled' && skillsResult.value.length > 0
        ? skillsResult.value
        : CURATED_SKILL_SNAPSHOT
    const indexedCandidates =
      countResult.status === 'fulfilled'
        ? Math.max(countResult.value, skills.length)
        : skills.length
    const outcomes = outcomesResult.status === 'fulfilled' ? outcomesResult.value : {}

    return buildReport(skills, indexedCandidates, outcomes)
  },
  ['state-of-agent-skills-2026-v1'],
  { revalidate: 3_600 }
)

export function getStateOfAgentSkillsReport() {
  return getCachedReport()
}

function csvCell(value: string | number | boolean | null) {
  if (value === null) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function renderStateOfAgentSkillsCsv(report: StateOfAgentSkillsReport) {
  const headers: Array<keyof StateOfAgentSkillsRow> = [
    'slug',
    'name',
    'repository',
    'category',
    'track',
    'trackLabel',
    'stars',
    'forks',
    'license',
    'lastPushedAt',
    'installReady',
    'qualityScore',
    'trustScore',
    'auditScore',
    'riskLevel',
    'skillLikenessScore',
    'skillLikenessTier',
    'classification',
    'agentOutcomeCount',
    'agentSuccessRate',
    'canonicalUrl',
  ]

  return [
    headers.join(','),
    ...report.skills.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
  ].join('\n')
}

export function renderStateOfAgentSkillsText(report: StateOfAgentSkillsReport) {
  const { metrics } = report
  return [
    `# ${report.title}`,
    '',
    `Published: ${report.publishedAt.slice(0, 10)}`,
    `Generated: ${report.generatedAt}`,
    `Canonical URL: ${report.canonicalUrl}`,
    '',
    '## Scope',
    `- Indexed candidates: ${metrics.indexedCandidates.toLocaleString()}`,
    `- Analyzed candidates: ${metrics.analyzedCandidates.toLocaleString()}`,
    `- Strict agent-skill candidates: ${metrics.skillSpecificCandidates.toLocaleString()}`,
    `- Agent workflow candidates: ${metrics.agentWorkflowCandidates.toLocaleString()}`,
    `- Domain workflow and ecosystem tools: ${metrics.domainToolCandidates.toLocaleString()}`,
    `- Lists and collections: ${metrics.collectionCandidates.toLocaleString()}`,
    `- Generic candidates: ${metrics.genericCandidates.toLocaleString()}`,
    `- Maintained within 180 days: ${metrics.maintainedCandidates.toLocaleString()}`,
    `- Known license: ${metrics.knownLicenseCandidates.toLocaleString()}`,
    `- High trust: ${metrics.highTrustCandidates.toLocaleString()}`,
    `- Agent Proven skills: ${metrics.agentProvenSkills.toLocaleString()}`,
    `- Reported agent outcomes: ${metrics.totalAgentOutcomes.toLocaleString()}`,
    '',
    '## Findings',
    ...report.findings.map((finding) => `- ${finding}`),
    '',
    '## Leading skill-specific candidates',
    ...report.topSkills.map(
      (skill, index) =>
        `${index + 1}. ${skill.name} — ${formatCompactNumber(skill.stars)} stars, ${skill.trustScore}/100 trust, ${skill.riskLevel}, ${skill.canonicalUrl}`
    ),
    '',
    '## Methodology',
    report.methodology.indexedPopulation,
    report.methodology.analyzedSample,
    ...report.methodology.limitations.map((limitation) => `- Limitation: ${limitation}`),
    '',
  ].join('\n')
}
