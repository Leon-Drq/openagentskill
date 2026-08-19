import 'server-only'

import type { SkillRecord } from '@/lib/db/skills'
import { reviewSkill } from '@/lib/ai-review/reviewer'
import { validateGitHubRepo } from '@/lib/github/api'
import {
  discoverGitHubSkills,
  fetchDelegatedGitHubSkill,
  fetchSkillPackageFiles,
  parseGitHubSkillReference,
  type DiscoveredGitHubSkill,
} from '@/lib/github/skill-source'
import { analyzeCode } from '@/lib/security/static-analysis'
import { evaluateSkillSubmissionPolicy } from '@/lib/skills/submission-policy'
import { estimateSubmissionQuality } from '@/lib/skills/submission-quality'
import { createPublicClient } from '@/lib/supabase/public'

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
  maxSkills?: number
  refreshExisting?: boolean
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
  discoverySource: string
) {
  return {
    ...existing,
    repository: skill.sourceUrl,
    github_repo: repository.fullName,
    github_stars: repository.stars,
    github_forks: repository.forks,
    github_language: repository.language || existing.github_language || null,
    github_last_pushed_at: repository.updatedAt,
    long_description: skill.document.slice(0, 12_000),
    version: normalizeVersion(skill.frontmatter.version || existing.version),
    license: skill.frontmatter.license || repository.license || existing.license || 'Unknown',
    submission_source: existing.submission_source || discoverySource,
    ai_review_score: {
      ...(existing.ai_review_score && typeof existing.ai_review_score === 'object' ? existing.ai_review_score : {}),
      source_url: skill.sourceUrl,
      source_ref: skill.ref,
      skill_path: skill.path,
      last_source_sync_at: new Date().toISOString(),
    },
  }
}

async function payloadForNew(
  skill: DiscoveredGitHubSkill,
  repository: Awaited<ReturnType<typeof validateGitHubRepo>>,
  discoverySource: string
) {
  const delegatedSkill = await fetchDelegatedGitHubSkill(skill)
  const packageGroups = await Promise.all([
    fetchSkillPackageFiles(skill),
    delegatedSkill ? fetchSkillPackageFiles(delegatedSkill) : Promise.resolve([]),
  ])
  const codeFiles = packageGroups.flat()
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
    }
  }

  const review = await reviewSkill({
    repository: skill.sourceUrl,
    readmeContent: reviewDocument,
    codeFiles,
    manifestData: skill.frontmatter,
    githubStats: {
      stars: repository.stars,
      forks: repository.forks,
      lastUpdated: repository.updatedAt,
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
    }
  }

  const slug = buildIndexedSkillSlug(repository.owner, skill.frontmatter.name)
  const tags = normalizeTags(skill, delegatedSkill ? ['skill-alias', 'composed-skill'] : [])
  const quality = estimateSubmissionQuality({
    githubStars: repository.stars,
    githubRepo: repository.fullName,
    githubUpdatedAt: repository.updatedAt,
    reviewTotal: review.totalScore,
    tags,
  })

  return {
    reason: null,
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
      github_last_pushed_at: repository.updatedAt,
      category: inferIndexedSkillCategory(skill),
      tags,
      frameworks: skill.frontmatter.frameworks,
      version: normalizeVersion(skill.frontmatter.version),
      license: skill.frontmatter.license || repository.license || 'Unknown',
      install_command: `npx skills add ${repository.fullName} --skill ${skill.frontmatter.name}`,
      verified: false,
      submission_source: discoverySource,
      submitted_by_agent: 'open-agent-skill-source-sync',
      ai_review_score: {
        ...review.scores,
        total: review.totalScore,
        source: 'recursive-skill-source-sync',
        source_url: skill.sourceUrl,
        source_ref: skill.ref,
        skill_path: skill.path,
        ...(delegatedSkill
          ? {
              delegates_to: delegatedSkill.frontmatter.name,
              delegated_skill_path: delegatedSkill.path,
              delegated_source_url: delegatedSkill.sourceUrl,
            }
          : {}),
      },
      ai_review_approved: true,
      ai_review_issues: policy.issues,
      ai_review_suggestions: policy.suggestions,
      quality_score: quality.score,
      quality_signals: quality.signals,
    },
  }
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
  const discovery = await discoverGitHubSkills(reference, repository)
  const supabase = createPublicClient({ requestTimeoutMs: DB_TIMEOUT_MS })
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
  const selected = orderedSkills(discovery.skills, existing, maxSkills)
  const entries: RepositorySkillSyncEntry[] = []
  const discoverySource = options.discoverySource || 'recursive-skill-source-sync'

  for (const item of selected) {
    const { skill, existing: existingSkill } = item
    const fallbackSlug = existingSkill?.slug || buildIndexedSkillSlug(repository.owner, skill.frontmatter.name)

    if (existingSkill && options.refreshExisting === false) {
      continue
    }

    try {
      const result = existingSkill
        ? { payload: payloadForExisting(existingSkill, skill, repository, discoverySource), reason: null }
        : await payloadForNew(skill, repository, discoverySource)

      if (!result.payload) {
        entries.push({
          slug: fallbackSlug,
          name: skill.frontmatter.name,
          path: skill.path,
          sourceUrl: skill.sourceUrl,
          status: 'rejected',
          reason: result.reason || 'Automated review rejected the skill.',
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

      entries.push({
        slug: String(result.payload.slug || fallbackSlug),
        name: skill.frontmatter.name,
        path: skill.path,
        sourceUrl: skill.sourceUrl,
        status: data?.created ? 'created' : 'updated',
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
    discovered: discovery.skills.length,
    processed: entries.length,
    created: entries.filter((entry) => entry.status === 'created').length,
    updated: entries.filter((entry) => entry.status === 'updated').length,
    rejected: entries.filter((entry) => entry.status === 'rejected').length,
    errors: entries.filter((entry) => entry.status === 'error').length,
    truncated: discovery.truncated || discovery.skills.length > maxSkills,
    entries,
  }
}
