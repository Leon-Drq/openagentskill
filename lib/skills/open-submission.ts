import 'server-only'

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { GitHubRepo } from '@/lib/schema/skill-schema'
import type { DiscoveredGitHubSkill } from '@/lib/github/skill-source'
import { reviewSkill } from '@/lib/ai-review/reviewer'
import { analyzeCode } from '@/lib/security/static-analysis'
import { evaluateSkillSubmissionPolicy } from '@/lib/skills/submission-policy'
import { estimateSubmissionQuality } from '@/lib/skills/submission-quality'
import { createAdminClient } from '@/lib/supabase/admin'

export const SUBMISSION_RATE_LIMIT = 5
export const SUBMISSION_RATE_WINDOW_HOURS = 24
export const VALIDATION_RATE_LIMIT = 20
export const VALIDATION_RATE_WINDOW_HOURS = 24

export type OpenSubmissionStatus =
  | 'submitted'
  | 'processing'
  | 'listed'
  | 'reviewed'
  | 'duplicate'
  | 'quarantined'

export interface OpenSubmissionInput {
  repository: GitHubRepo
  skill: DiscoveredGitHubSkill
  category?: string
  tags?: string[]
  submissionSource: 'web' | 'api' | 'agent'
  submittedByAgent?: string
  makerGithub?: string
  makerX?: string
  requestFingerprint: string
  codeFiles: { path: string; content: string }[]
}

export interface OpenSubmissionReceipt {
  id: string
  token: string
  status: OpenSubmissionStatus
  skill: {
    name: string
    description: string
    path: string
    sourceUrl: string
  }
}

const ALLOWED_CATEGORIES = new Set([
  'data-analysis',
  'code-generation',
  'research',
  'automation',
  'communication',
  'creative',
  'business',
  'developer-tools',
  'security',
  'integration',
])

export function hashSubmissionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function submissionTokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashSubmissionToken(token), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function buildRequestFingerprint(ip: string, userAgent: string) {
  const secret =
    process.env.SUBMISSION_FINGERPRINT_SECRET ||
    process.env.INDEXER_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    'openagentskill-public-intake'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256')
    .update(`${secret}\n${day}\n${ip}\n${userAgent.slice(0, 300)}`)
    .digest('hex')
}

export async function enforceSubmissionRateLimit(requestFingerprint: string) {
  const supabase = createAdminClient({ requestTimeoutMs: 8_000 })
  const since = new Date(Date.now() - SUBMISSION_RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('skill_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('request_fingerprint', requestFingerprint)
    .gte('created_at', since)

  if (error) throw error
  if ((count || 0) >= SUBMISSION_RATE_LIMIT) {
    const error = new Error('Submission rate limit reached. Please try again later.')
    error.name = 'SubmissionRateLimitError'
    throw error
  }
}

export async function enforceValidationRateLimit(requestFingerprint: string) {
  const supabase = createAdminClient({ requestTimeoutMs: 8_000 })
  const since = new Date(Date.now() - VALIDATION_RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('submission_validation_events')
    .select('id', { count: 'exact', head: true })
    .eq('request_fingerprint', requestFingerprint)
    .gte('created_at', since)

  if (error) throw error
  if ((count || 0) >= VALIDATION_RATE_LIMIT) {
    const limitError = new Error('Validation rate limit reached. Please try again later.')
    limitError.name = 'ValidationRateLimitError'
    throw limitError
  }

  const { error: insertError } = await supabase
    .from('submission_validation_events')
    .insert({ request_fingerprint: requestFingerprint })
  if (insertError) throw insertError
}

function normalizeCategory(input: OpenSubmissionInput) {
  const requested = input.category?.trim().toLowerCase()
  if (requested && ALLOWED_CATEGORIES.has(requested)) return requested

  const fromSkill = input.skill.frontmatter.category?.trim().toLowerCase()
  if (fromSkill && ALLOWED_CATEGORIES.has(fromSkill)) return fromSkill

  const text = `${input.skill.frontmatter.name} ${input.skill.frontmatter.description} ${input.skill.path}`.toLowerCase()
  if (/security|audit|vulnerab|secret|compliance/.test(text)) return 'security'
  if (/research|search|source|summari/.test(text)) return 'research'
  if (/design|image|video|creative|visual/.test(text)) return 'creative'
  if (/data|csv|spreadsheet|analytics|chart/.test(text)) return 'data-analysis'
  if (/api|integration|connector|webhook/.test(text)) return 'integration'
  if (/code|developer|github|test|debug/.test(text)) return 'developer-tools'
  if (/business|marketing|sales|finance/.test(text)) return 'business'
  if (/write|email|communication|social/.test(text)) return 'communication'
  return 'automation'
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function buildSlug(input: OpenSubmissionInput) {
  const base = `${slugPart(input.repository.owner)}-${slugPart(input.repository.repo)}`
  const skillName = slugPart(input.skill.frontmatter.name)
  const hasMultipleOrNestedSkill = Boolean(input.skill.directory)
  return hasMultipleOrNestedSkill && skillName ? `${base}-${skillName}`.slice(0, 180) : base
}

function normalizeTags(input: OpenSubmissionInput) {
  const source = [
    ...(input.tags || []),
    ...input.skill.frontmatter.tags,
    'agent-skill',
  ]
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of source) {
    const tag = value.trim().toLowerCase().replace(/[^a-z0-9+#.-]+/g, '-').replace(/^-+|-+$/g, '')
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    result.push(tag.slice(0, 40))
    if (result.length >= 10) break
  }
  return result
}

function normalizeVersion(value: string | undefined) {
  return value && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(value) ? value : '1.0.0'
}

export async function createOpenSubmission(input: OpenSubmissionInput): Promise<OpenSubmissionReceipt> {
  await enforceSubmissionRateLimit(input.requestFingerprint)

  const supabase = createAdminClient({ requestTimeoutMs: 12_000 })
  const id = randomUUID()
  const token = randomBytes(24).toString('hex')
  const staticAnalysis = analyzeCode(input.codeFiles)
  const initialStatus: OpenSubmissionStatus = staticAnalysis.passed ? 'submitted' : 'quarantined'

  const { error } = await supabase.from('skill_submissions').insert({
    id,
    github_repo: input.repository.fullName,
    repository_url: input.skill.sourceUrl,
    source_ref: input.skill.ref,
    skill_path: input.skill.path,
    skill_name: input.skill.frontmatter.name,
    skill_description: input.skill.frontmatter.description,
    category: normalizeCategory(input),
    tags: normalizeTags(input),
    submission_source: input.submissionSource,
    submitted_by_agent: input.submittedByAgent || null,
    submitter_github: input.makerGithub || null,
    submitter_x: input.makerX || null,
    identity_provider: null,
    identity_verified: false,
    status_token_hash: hashSubmissionToken(token),
    request_fingerprint: input.requestFingerprint,
    validation_result: {
      standard: 'SKILL.md',
      source_url: input.skill.sourceUrl,
      source_ref: input.skill.ref,
      skill_path: input.skill.path,
      github_stars: input.repository.stars,
      repository_readme: input.repository.hasReadme,
      static_analysis: staticAnalysis,
      publisher_identity: 'declared_unverified',
    },
    ai_review_result: staticAnalysis.passed
      ? {}
      : {
          approved: false,
          stage: 'static_security',
          issues: staticAnalysis.issues,
          suggestions: ['Remove critical-risk behavior and submit a new immutable revision.'],
        },
    status: initialStatus,
    reviewed_at: staticAnalysis.passed ? null : new Date().toISOString(),
  })

  if (error) throw error

  return {
    id,
    token,
    status: initialStatus,
    skill: {
      name: input.skill.frontmatter.name,
      description: input.skill.frontmatter.description,
      path: input.skill.path,
      sourceUrl: input.skill.sourceUrl,
    },
  }
}

export async function reviewOpenSubmission(input: OpenSubmissionInput, submissionId: string) {
  const supabase = createAdminClient({ requestTimeoutMs: 20_000 })
  const startedAt = new Date().toISOString()
  await supabase
    .from('skill_submissions')
    .update({ status: 'processing', review_started_at: startedAt })
    .eq('id', submissionId)

  const staticAnalysis = analyzeCode(input.codeFiles)
  if (!staticAnalysis.passed) return

  try {
    const review = await reviewSkill({
      repository: input.skill.sourceUrl,
      readmeContent: input.skill.document,
      codeFiles: input.codeFiles,
      manifestData: input.skill.frontmatter,
      githubStats: {
        stars: input.repository.stars,
        forks: input.repository.forks,
        lastUpdated: input.repository.updatedAt,
        license: input.skill.frontmatter.license || input.repository.license,
        language: input.repository.language,
      },
    })
    const policy = evaluateSkillSubmissionPolicy({
      stars: input.repository.stars,
      hasReadme: input.repository.hasReadme,
      hasSkillDocument: true,
      staticAnalysis,
      review,
    })
    const reviewedAt = new Date().toISOString()
    const reviewPayload = {
      ...review,
      approved: policy.approved,
      policy,
      static_analysis: staticAnalysis,
      publisher_identity: 'declared_unverified',
    }

    if (!policy.approved) {
      const { error } = await supabase
        .from('skill_submissions')
        .update({ status: 'listed', ai_review_result: reviewPayload, reviewed_at: reviewedAt })
        .eq('id', submissionId)
      if (error) throw error
      return
    }

    const slug = buildSlug(input)
    const category = normalizeCategory(input)
    const tags = normalizeTags(input)
    const authorName = input.makerGithub || input.skill.frontmatter.author || input.repository.owner
    const quality = estimateSubmissionQuality({
      githubStars: input.repository.stars,
      githubRepo: input.repository.fullName,
      githubUpdatedAt: input.repository.updatedAt,
      reviewTotal: review.totalScore,
      tags,
    })
    const sourceContentHash = createHash('sha256').update(input.skill.document).digest('hex')
    const skillPayload = {
      slug,
      name: input.skill.frontmatter.name,
      description: input.skill.frontmatter.description,
      long_description: input.skill.document.slice(0, 12_000),
      tagline: input.skill.frontmatter.description.slice(0, 280),
      author_name: authorName,
      author_url: `https://github.com/${input.makerGithub || input.repository.owner}`,
      repository: input.skill.sourceUrl,
      github_repo: input.repository.fullName,
      github_stars: input.repository.stars,
      github_forks: input.repository.forks,
      github_language: input.repository.language || null,
      github_last_pushed_at: input.repository.updatedAt,
      category,
      tags,
      frameworks: input.skill.frontmatter.frameworks,
      version: normalizeVersion(input.skill.frontmatter.version),
      license: input.skill.frontmatter.license || input.repository.license || 'Unknown',
      install_command: `npx skills add ${input.repository.fullName} --skill ${input.skill.frontmatter.name}`,
      verified: false,
      listing_status: 'reviewed',
      source_ref: input.skill.ref,
      source_path: input.skill.path,
      source_content_hash: sourceContentHash,
      publisher_github: input.makerGithub || null,
      publisher_x: input.makerX || null,
      publisher_verified: false,
      submission_source: input.submissionSource,
      submitted_by_agent: input.submittedByAgent || null,
      ai_review_score: {
        ...review.scores,
        total: review.totalScore,
        source: 'open-skill-submission',
        skill_path: input.skill.path,
        source_url: input.skill.sourceUrl,
      },
      ai_review_approved: true,
      ai_review_issues: policy.issues,
      ai_review_suggestions: policy.suggestions,
      quality_score: quality.score,
      quality_signals: quality.signals,
    }

    const { data: createdSkill, error: createError } = await supabase
      .from('skills')
      .insert(skillPayload)
      .select('id, slug')
      .single()

    if (createError) {
      if (createError.code !== '23505') throw createError
      const { data: existing } = await supabase
        .from('skills')
        .select('id, slug')
        .or(`slug.eq.${slug},source_content_hash.eq.${sourceContentHash}`)
        .limit(1)
        .maybeSingle()
      const { error: duplicateError } = await supabase
        .from('skill_submissions')
        .update({
          status: 'duplicate',
          skill_id: existing?.id || null,
          ai_review_result: reviewPayload,
          reviewed_at: reviewedAt,
        })
        .eq('id', submissionId)
      if (duplicateError) throw duplicateError
      return
    }

    const { error: updateError } = await supabase
      .from('skill_submissions')
      .update({
        status: 'reviewed',
        skill_id: createdSkill.id,
        ai_review_result: reviewPayload,
        reviewed_at: reviewedAt,
      })
      .eq('id', submissionId)
    if (updateError) throw updateError

    const { error: qualityRefreshError } = await supabase.rpc('refresh_skill_quality_scores', { p_slug: slug })
    if (qualityRefreshError) {
      console.warn('[submission-review] Quality refresh fallback retained:', qualityRefreshError.message)
    }

    try {
      revalidateTag('public-skill-directory', 'max')
      revalidatePath('/skills')
      revalidatePath('/api/skills/search')
    } catch (cacheError) {
      console.warn('[submission-review] Cache invalidation deferred:', cacheError)
    }

    await supabase.from('activity_feed').insert({
      event_type: input.submissionSource === 'agent' ? 'agent_submitted' : 'skill_published',
      skill_id: createdSkill.id,
      actor_name: authorName,
      actor_type: input.submissionSource === 'agent' ? 'agent' : 'human',
      description: `Published ${input.skill.frontmatter.name} from an explicit SKILL.md source.`,
      metadata: {
        source: input.submissionSource,
        source_url: input.skill.sourceUrl,
        source_ref: input.skill.ref,
        skill_path: input.skill.path,
        publisher_identity: 'declared_unverified',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown review error'
    await supabase
      .from('skill_submissions')
      .update({
        status: 'listed',
        reviewed_at: new Date().toISOString(),
        ai_review_result: {
          approved: false,
          stage: 'review_error',
          issues: ['Automatic review could not be completed.'],
          suggestions: ['The submission remains in the community queue for manual review.'],
          reasoning: message.slice(0, 1000),
        },
      })
      .eq('id', submissionId)
  }
}
