import 'server-only'

import { createHash } from 'node:crypto'
import type { SkillRecord } from '@/lib/db/skills'
import { reviewSkill } from '@/lib/ai-review/reviewer'
import { fetchRepositoryCommitSha, validateGitHubRepo } from '@/lib/github/api'
import {
  discoverGitHubSkills,
  fetchDelegatedGitHubSkill,
  fetchSkillPackageSnapshot,
  parseGitHubSkillReference,
  type DiscoveredGitHubSkill,
} from '@/lib/github/skill-source'
import { analyzeCode } from '@/lib/security/static-analysis'
import { evaluateSkillSubmissionPolicy } from '@/lib/skills/submission-policy'
import { estimateSubmissionQuality } from '@/lib/skills/submission-quality'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLicenseEvidence } from '@/lib/creator-ownership'
import { evaluateFastTrackCandidate } from '@/lib/indexer/fast-track'
import { shouldRetryAutomatedReview } from '@/lib/indexer/review-retry'

const DEFAULT_MAX_SKILLS_PER_REPOSITORY = 8
const MAX_SKILLS_PER_REPOSITORY = 20
const DB_TIMEOUT_MS = 20_000

export type RepositorySkillSyncEntryStatus = 'created' | 'updated' | 'rejected' | 'error'

export interface RepositorySkillSyncEntry {
  slug: string
  name: string
  path: string
  sourceUrl: string
  status: RepositorySkillSyncEntryStatus
  reason?: string
  retryable?: boolean
}

export interface RepositorySkillSyncResult {
  repository: string
  reference: string
  discovered: number
  processed: number
  created: number
  updated: number
  rejected: number
  errors: number
  truncated: boolean
  entries: RepositorySkillSyncEntry[]
}

export interface RepositorySkillSyncOptions {
  reference: string
  discoverySource?: string
  discoveryMetadata?: Record<string, unknown>
  skillNames?: string[]
  maxSkills?: number
  refreshExisting?: boolean
  /** Fast-track is deterministic and is re-checked immediately before publication. */
  reviewMode?: 'ai' | 'fast-track'
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function buildIndexedSkillSlug(owner: string, skillName: string) {
  return `${slugPart(owner)}-${slugPart(skillName)}`.replace(/-+/g, '-').slice(0, 180)
}

export function inferIndexedSkillCategory(skill: Pick<DiscoveredGitHubSkill, 'path' | 'frontmatter'>) {
  const declared = skill.frontmatter.category?.trim().toLowerCase()
  if (declared) return declared

  const text = `${skill.frontmatter.name} ${skill.frontmatter.description} ${skill.path}`.toLowerCase()
  if (/security|audit|vulnerab|secret|compliance/.test(text)) return 'security'
  if (/research|search|source|summari|interview|requirement|spec/.test(text)) return 'research'
  if (/design|taste|image|video|creative|visual|ui|ux/.test(text)) return 'design-creative'
  if (/data|csv|spreadsheet|analytics|chart/.test(text)) return 'data-analysis'
  if (/react|code|developer|github|test|debug|desktop app/.test(text)) return 'coding-agents'
  if (/business|marketing|sales|finance/.test(text)) return 'business'
  if (/write|email|communication|social|simplif/.test(text)) return 'productivity'
  return 'automation'
}

function normalizeTags(skill: DiscoveredGitHubSkill, extraTags: string[] = []) {
  const source = [...skill.frontmatter.tags, ...extraTags, 'agent-skill']
  const seen = new Set<string>()
  return source
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9+#.-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter((value) => value && !seen.has(value) && Boolean(seen.add(value)))
    .slice(0, 10)
}

function normalizeVersion(value: string | undefined) {
  return value && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(value) ? value : '1.0.0'
}

function contentHash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeSourceUrl(value: string | null | undefined) {
  return (value || '').trim().replace(/\/$/, '').toLowerCase()
}

function sourceTail(value: string | null | undefined) {
  const normalized = normalizeSourceUrl(value)
  return normalized.split('/').filter(Boolean).at(-1) || ''
}

function findExistingSkill(existing: SkillRecord[], skill: DiscoveredGitHubSkill) {
  const source = normalizeSourceUrl(skill.sourceUrl)
  const pathTail = slugPart(skill.directory.split('/').filter(Boolean).at(-1) || skill.frontmatter.name)
  const name = slugPart(skill.frontmatter.name)

  return existing.find((record) => normalizeSourceUrl(record.repository) === source) ||
    existing.find((record) => {
      const existingTail = slugPart(sourceTail(record.repository))
      return existingTail === pathTail || (existingTail === name && slugPart(record.name) === name)
    })
}

function orderedSkills(skills: DiscoveredGitHubSkill[], existing: SkillRecord[], limit: number) {
  return skills
    .map((skill) => ({ skill, existing: findExistingSkill(existing, skill) }))
    .sort((left, right) => Number(Boolean(left.existing)) - Number(Boolean(right.existing)))
    .slice(0, limit)
}

function payloadForExisting(
  existing: SkillRecord,
  skill: DiscoveredGitHubSkill,
  repository: Awaited<ReturnType<typeof validateGitHubRepo>>,
  discoverySource: string,
  discoveryMetadata?: Record<string, unknown>
) {
  const license = getLicenseEvidence(skill.frontmatter.license, repository.license || existing.license)
  return {
    ...existing,
    repository: skill.sourceUrl,
    github_repo: repository.fullName,
    github_stars: repository.stars,
    github_forks: repository.forks,
    github_language: repository.language || existing.github_language || null,
    github_last_pushed_at: repository.pushedAt || repository.updatedAt,
    long_description: skill.document.slice(0, 12_000),
    version: normalizeVersion(skill.frontmatter.version || existing.version),
    license: license.license,
    license_source: license.source,
    license_status: license.status,
    source_content_hash: contentHash(skill.document),
    submission_source: existing.submission_source || discoverySource,
    ai_review_score: {
      ...(existing.ai_review_score && typeof existing.ai_review_score === 'object' ? existing.ai_review_score : {}),
      source_url: skill.sourceUrl,
      source_ref: skill.ref,
      skill_path: skill.path,
      last_source_sync_at: new Date().toISOString(),
      ...(discoveryMetadata || {}),
    },
  }
}

async function payloadForNew(
  skill: DiscoveredGitHubSkill,
  repository: Awaited<ReturnType<typeof validateGitHubRepo>>,
  discoverySource: string,
  discoveryMetadata?: Record<string, unknown>,
  reviewMode: 'ai' | 'fast-track' = 'ai',
  slugOverride?: string
) {
  const delegatedSkill = await fetchDelegatedGitHubSkill(skill)
  const packageSnapshots = await Promise.all([
    fetchSkillPackageSnapshot(skill),
    delegatedSkill ? fetchSkillPackageSnapshot(delegatedSkill) : Promise.resolve(null),
  ])
  const codeFiles = packageSnapshots.flatMap((snapshot) => snapshot?.files || [])
  const packageTruncated = packageSnapshots.some((snapshot) => Boolean(snapshot?.truncated))
  const hasUnreviewedFiles = packageSnapshots.some((snapshot) => Boolean(snapshot?.hasUnreviewedFiles))
  const reviewDocument = delegatedSkill
    ? [
        skill.document,
        `## Delegated implementation: ${delegatedSkill.frontmatter.name}`,
        `Source: ${delegatedSkill.sourceUrl}`,
        delegatedSkill.document,
      ].join('\n\n')
    : skill.document
  const staticAnalysis = analyzeCode(codeFiles)
  if (!staticAnalysis.passed) {
    return {
      payload: null,
      reason: staticAnalysis.issues.slice(0, 2).join('; ') || 'Static security analysis rejected the skill.',
      retryable: false,
    }
  }
  const license = getLicenseEvidence(skill.frontmatter.license, repository.license)
  let reviewScores: { security: number; quality: number; usefulness: number; compliance: number }
  let reviewTotal: number
  let reviewSource: string
  let reviewIssues: string[]
  let reviewSuggestions: string[]

  if (reviewMode === 'fast-track') {
    const decision = evaluateFastTrackCandidate({
      stars: repository.stars,
      licenseStatus: license.status,
      updatedAt: repository.pushedAt || repository.updatedAt,
      document: reviewDocument,
      files: codeFiles,
      packageTruncated,
      hasUnreviewedFiles,
    })
    if (!decision.eligible) {
      return {
        payload: null,
        reason: decision.reasons.slice(0, 3).join('; ') || 'Deterministic fast-track safety check failed.',
        retryable: false,
      }
    }
    reviewScores = { security: 9, quality: 8, usefulness: 8, compliance: 9 }
    reviewTotal = 34
    reviewSource = 'deterministic-fast-track-v1'
    reviewIssues = []
    reviewSuggestions = ['Creator ownership and identity remain unverified until the maintainer claims this skill.']
  } else {
    const review = await reviewSkill({
      repository: skill.sourceUrl,
      readmeContent: reviewDocument,
      codeFiles,
      manifestData: skill.frontmatter,
      githubStats: {
        stars: repository.stars,
        forks: repository.forks,
        lastUpdated: repository.pushedAt || repository.updatedAt,
        license: skill.frontmatter.license || repository.license,
        language: repository.language,
      },
    })
    const policy = evaluateSkillSubmissionPolicy({
      stars: repository.stars,
      hasReadme: repository.hasReadme,
      hasSkillDocument: true,
      staticAnalysis,
      review,
    })
    if (!policy.approved) {
      return {
        payload: null,
        reason: policy.issues.slice(0, 2).join('; ') || 'Automated review did not approve this skill.',
        retryable: shouldRetryAutomatedReview(review.reviewModel),
      }
    }
    reviewScores = review.scores
    reviewTotal = review.totalScore
    reviewSource = 'recursive-skill-source-sync'
    reviewIssues = policy.issues
    reviewSuggestions = policy.suggestions
  }

  const slug = slugOverride || buildIndexedSkillSlug(repository.owner, skill.frontmatter.name)
  const tags = normalizeTags(skill, delegatedSkill ? ['skill-alias', 'composed-skill'] : [])
  const quality = estimateSubmissionQuality({
    githubStars: repository.stars,
    githubRepo: repository.fullName,
    githubUpdatedAt: repository.pushedAt || repository.updatedAt,
    reviewTotal,
    tags,
  })

  return {
    reason: null,
    retryable: false,
    payload: {
      slug,
      name: skill.frontmatter.name,
      description: skill.frontmatter.description,
      long_description: reviewDocument.slice(0, 12_000),
      tagline: skill.frontmatter.description.slice(0, 280),
      author_name: skill.frontmatter.author || repository.owner,
      author_url: `https://github.com/${repository.owner}`,
      repository: skill.sourceUrl,
      github_repo: repository.fullName,
      github_stars: repository.stars,
      github_forks: repository.forks,
      github_language: repository.language || null,
      github_last_pushed_at: repository.pushedAt || repository.updatedAt,
      category: inferIndexedSkillCategory(skill),
      tags,
      frameworks: skill.frontmatter.frameworks,
      version: normalizeVersion(skill.frontmatter.version),
      license: license.license,
      license_source: license.source,
      license_status: license.status,
      source_content_hash: contentHash(skill.document),
      install_command: `npx skills add ${repository.fullName} --skill ${skill.frontmatter.name}`,
      verified: false,
      submission_source: discoverySource,
      submitted_by_agent: 'open-agent-skill-source-sync',
      ai_review_score: {
        ...reviewScores,
        total: reviewTotal,
        source: reviewSource,
        source_url: skill.sourceUrl,
        source_ref: skill.ref,
        skill_path: skill.path,
        ...(discoveryMetadata || {}),
        ...(delegatedSkill
          ? {
              delegates_to: delegatedSkill.frontmatter.name,
              delegated_skill_path: delegatedSkill.path,
              delegated_source_url: delegatedSkill.sourceUrl,
            }
          : {}),
      },
      ai_review_approved: true,
      ai_review_issues: reviewIssues,
      ai_review_suggestions: reviewSuggestions,
      quality_score: quality.score,
      quality_signals: quality.signals,
    },
  }
}

async function resolveIndexedSkillSlug(
  client: ReturnType<typeof createPublicClient>,
  baseSlug: string,
  sourceUrl: string
) {
  const lookup = async (slug: string) => {
    const { data, error } = await client
      .from('skills')
      .select('repository')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(`Skill slug collision lookup failed: ${error.message}`)
    return data as { repository?: string | null } | null
  }

  const current = await lookup(baseSlug)
  if (!current || normalizeSourceUrl(current.repository) === normalizeSourceUrl(sourceUrl)) return baseSlug

  const suffix = contentHash(sourceUrl).slice(0, 8)
  const candidate = `${baseSlug.slice(0, 171)}-${suffix}`
  const suffixed = await lookup(candidate)
  if (!suffixed || normalizeSourceUrl(suffixed.repository) === normalizeSourceUrl(sourceUrl)) return candidate
  return `${baseSlug.slice(0, 167)}-${contentHash(sourceUrl).slice(0, 12)}`
}

export async function syncRepositorySkills(
  options: RepositorySkillSyncOptions
): Promise<RepositorySkillSyncResult> {
  const reference = parseGitHubSkillReference(options.reference)
  if (!reference) throw new Error(`Invalid GitHub skill source: ${options.reference}`)

  const serverSecret = (process.env.INDEXER_SECRET || '').trim()
  if (!serverSecret) throw new Error('Missing INDEXER_SECRET for recursive skill source sync.')

  const repository = await validateGitHubRepo(`${reference.owner}/${reference.repo}`, {
    checkReadme: true,
    checkSkillJson: false,
  })
  const sourceCommitSha = await fetchRepositoryCommitSha(
    reference.owner,
    reference.repo,
    reference.ref || repository.defaultBranch
  )
  const discovery = await discoverGitHubSkills(reference, repository)
  const supabase = createPublicClient({ requestTimeoutMs: DB_TIMEOUT_MS })
  const admin = createAdminClient({ requestTimeoutMs: DB_TIMEOUT_MS })
  const { data: existingData, error: existingError } = await supabase
    .from('skills')
    .select('*')
    .eq('github_repo', repository.fullName)
  if (existingError) throw new Error(`Existing skill lookup failed: ${existingError.message}`)

  const existing = (existingData || []) as SkillRecord[]
  const maxSkills = Math.min(
    Math.max(Math.floor(options.maxSkills || DEFAULT_MAX_SKILLS_PER_REPOSITORY), 1),
    MAX_SKILLS_PER_REPOSITORY
  )
  const requestedNames = new Set((options.skillNames || []).map(slugPart).filter(Boolean))
  const matchedSkills = requestedNames.size
    ? discovery.skills.filter((skill) => {
        const name = slugPart(skill.frontmatter.name)
        const directory = slugPart(skill.directory.split('/').filter(Boolean).at(-1) || '')
        return requestedNames.has(name) || requestedNames.has(directory)
      })
    : discovery.skills
  const selected = orderedSkills(matchedSkills, existing, maxSkills)
  const entries: RepositorySkillSyncEntry[] = []
  const discoverySource = options.discoverySource || 'recursive-skill-source-sync'

  for (const item of selected) {
    const { skill, existing: existingSkill } = item
    const fallbackSlug = existingSkill?.slug || buildIndexedSkillSlug(repository.owner, skill.frontmatter.name)

    if (existingSkill && options.refreshExisting === false) {
      continue
    }

    try {
      if (existingSkill && options.reviewMode === 'fast-track') {
        entries.push({
          slug: fallbackSlug,
          name: skill.frontmatter.name,
          path: skill.path,
          sourceUrl: skill.sourceUrl,
          status: 'rejected',
          reason: 'Fast-track does not update an existing listing; the version-sync pipeline owns existing skills.',
        })
        continue
      }
      const resolvedSlug = existingSkill
        ? existingSkill.slug
        : await resolveIndexedSkillSlug(supabase, fallbackSlug, skill.sourceUrl)
      const result = existingSkill
        ? { payload: payloadForExisting(existingSkill, skill, repository, discoverySource, options.discoveryMetadata), reason: null }
        : await payloadForNew(
            skill,
            repository,
            discoverySource,
            options.discoveryMetadata,
            options.reviewMode || 'ai',
            resolvedSlug
          )

      if (!result.payload) {
        entries.push({
          slug: fallbackSlug,
          name: skill.frontmatter.name,
          path: skill.path,
          sourceUrl: skill.sourceUrl,
          status: 'rejected',
          reason: result.reason || 'Automated review rejected the skill.',
          retryable: result.retryable,
        })
        continue
      }

      const { data, error } = await supabase.rpc('upsert_indexed_skill', {
        p_server_secret: serverSecret,
        p_skill: result.payload,
        p_activity: {
          event_type: 'skill_published',
          actor_name: 'OpenAgentSkill Source Sync',
          actor_type: 'agent',
          description: `Indexed ${skill.frontmatter.name} from an explicit SKILL.md path.`,
          metadata: {
            source: discoverySource,
            source_repo: repository.fullName,
            source_ref: skill.ref,
            source_path: skill.path,
            source_url: skill.sourceUrl,
          },
        },
      })
      if (error) throw new Error(error.message)

      const sourceContentHash = String(result.payload.source_content_hash || contentHash(skill.document))
      const { data: versionData, error: versionError } = await admin.rpc('record_skill_source_version', {
        p_server_secret: serverSecret,
        p_skill_slug: String(result.payload.slug || fallbackSlug),
        p_source_commit_sha: sourceCommitSha || '',
        p_source_content_hash: sourceContentHash,
        p_source_ref: skill.ref,
        p_source_path: skill.path,
        p_version: String(result.payload.version || '1.0.0'),
        p_license: String(result.payload.license || 'Unknown'),
        p_license_source: String(result.payload.license_source || 'unknown'),
        p_metadata: {
          source_url: skill.sourceUrl,
          discovery_source: discoverySource,
        },
      })
      if (versionError) throw new Error(`Source version record failed: ${versionError.message}`)

      entries.push({
        slug: String(result.payload.slug || fallbackSlug),
        name: skill.frontmatter.name,
        path: skill.path,
        sourceUrl: skill.sourceUrl,
        status: data?.created ? 'created' : 'updated',
        ...(versionData?.changed ? { reason: 'Source content changed and a new version was recorded.' } : {}),
      })
    } catch (error) {
      entries.push({
        slug: fallbackSlug,
        name: skill.frontmatter.name,
        path: skill.path,
        sourceUrl: skill.sourceUrl,
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown recursive skill sync error.',
      })
    }
  }

  return {
    repository: repository.fullName,
    reference: options.reference,
    discovered: matchedSkills.length,
    processed: entries.length,
    created: entries.filter((entry) => entry.status === 'created').length,
    updated: entries.filter((entry) => entry.status === 'updated').length,
    rejected: entries.filter((entry) => entry.status === 'rejected').length,
    errors: entries.filter((entry) => entry.status === 'error').length,
    truncated: discovery.truncated || matchedSkills.length > maxSkills,
    entries,
  }
}
