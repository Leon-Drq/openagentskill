import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import { getLicenseEvidence } from '@/lib/creator-ownership'
import { validateGitHubRepo } from '@/lib/github/api'
import {
  discoverGitHubSkills,
  fetchSkillPackageSnapshot,
  parseGitHubSkillReference,
  type DiscoveredGitHubSkill,
  type GitHubTreeItem,
} from '@/lib/github/skill-source'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CandidateRepo } from './github-search'
import {
  buildCandidateSourceKey,
  canonicalGitHubSourceUrl,
  normalizeCandidateSourcePath,
} from './candidate-identity'
import { evaluateFastTrackCandidate } from './fast-track'
import { syncRepositorySkills } from './repository-skill-sync'
import {
  AUTOMATIC_DISCOVERY_MIN_STARS,
  PUBLICATION_DAILY_TARGET,
  meetsAutomaticDiscoveryStarFloor,
} from './intake-policy'

const DB_TIMEOUT_MS = 20_000
const CANDIDATE_LEASE_SECONDS = 240
const VALIDATION_CONCURRENCY = 2
const VALIDATION_CHUNK_DELAY_MS = 800
const PUBLICATION_DELAY_MS = 2_500
const WORKER_TIME_BUDGET_MS = 210_000

export type SkillCandidateStatus =
  | 'discovered'
  | 'validating'
  | 'expanded'
  | 'fast_track'
  | 'review_required'
  | 'publishing'
  | 'published'
  | 'rejected'
  | 'duplicate'
  | 'validation_error'
  | 'publication_error'

const CANDIDATE_PIPELINE_STATUSES: SkillCandidateStatus[] = [
  'discovered',
  'validating',
  'expanded',
  'fast_track',
  'review_required',
  'publishing',
  'published',
  'rejected',
  'duplicate',
  'validation_error',
  'publication_error',
]

const READY_CANDIDATE_STATUSES: SkillCandidateStatus[] = [
  'discovered',
  'fast_track',
  'review_required',
  'validation_error',
  'publication_error',
]

export interface CandidatePipelineHealth {
  state: 'healthy' | 'backlogged' | 'degraded' | 'idle'
  counts: Record<SkillCandidateStatus, number>
  total_candidates: number
  ready_backlog: number
  errors_waiting_retry: number
  discovered_last_24_hours: number
  published_last_24_hours: number
  publication_target_per_24_hours: number
  publication_attainment_percent: number
  publication_gap: number
  estimated_days_to_clear_ready_backlog: number | null
  oldest_ready_candidate_at: string | null
  oldest_ready_age_hours: number | null
  latest_candidate_at: string | null
  latest_publication_at: string | null
}

export interface SkillCandidateRow {
  id: string
  source_key: string
  github_repository_id: number | null
  github_full_name: string
  github_owner: string
  github_repo: string
  source_ref: string | null
  source_path: string
  canonical_source_url: string
  source_content_hash: string | null
  skill_name: string | null
  skill_description: string | null
  github_stars: number
  github_updated_at: string | null
  license: string | null
  license_status: 'unknown' | 'missing' | 'restricted' | 'detected'
  status: SkillCandidateStatus
  risk_level: 'unknown' | 'low' | 'medium' | 'high' | 'critical'
  risk_reasons: string[]
  fast_track_eligible: boolean
  requires_ai_review: boolean
  duplicate_of: string | null
  discovery_source: string
  discovery_payload: Record<string, unknown>
  attempt_count: number
}

function contentHash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function admin() {
  return createAdminClient({ requestTimeoutMs: DB_TIMEOUT_MS })
}

export async function enqueueRepositoryCandidates(
  candidates: CandidateRepo[],
  discoverySource = 'github-search'
) {
  const unique = new Map<string, Record<string, unknown>>()
  let belowStarFloor = 0

  for (const candidate of candidates) {
    if (!meetsAutomaticDiscoveryStarFloor(candidate.stars)) {
      belowStarFloor += 1
      continue
    }
    const sourcePath = candidate.skillSourceUrl ? parseGitHubSkillReference(candidate.skillSourceUrl)?.path || '' : ''
    const sourceKey = buildCandidateSourceKey(candidate.githubId, candidate.fullName, sourcePath)
    unique.set(sourceKey, {
      source_key: sourceKey,
      github_repository_id: candidate.githubId || null,
      github_full_name: candidate.fullName,
      github_owner: candidate.owner,
      github_repo: candidate.repo,
      source_ref: null,
      source_path: normalizeCandidateSourcePath(sourcePath),
      canonical_source_url: candidate.skillSourceUrl || candidate.htmlUrl || canonicalGitHubSourceUrl(candidate.fullName),
      github_stars: Math.max(0, candidate.stars || 0),
      github_updated_at: candidate.pushedAt || candidate.updatedAt || null,
      status: 'discovered',
      discovery_source: discoverySource,
      discovery_payload: {
        description: candidate.description,
        language: candidate.language,
        topics: candidate.topics || [],
        discovery: candidate.discovery || null,
      },
      last_seen_at: new Date().toISOString(),
    })
  }

  const rows = Array.from(unique.values())
  if (!rows.length) {
    return { attempted: candidates.length, inserted: 0, duplicates: 0, belowStarFloor }
  }

  const { data, error } = await admin()
    .from('skill_candidates')
    .upsert(rows, { onConflict: 'source_key', ignoreDuplicates: true })
    .select('id')
  if (error) throw new Error(`Candidate enqueue failed: ${error.message}`)

  const inserted = data?.length || 0
  return {
    attempted: candidates.length,
    inserted,
    duplicates: rows.length - inserted,
    belowStarFloor,
  }
}

async function claimCandidates(statuses: SkillCandidateStatus[], limit: number, workerPrefix: string) {
  const workerId = `${workerPrefix}-${randomUUID()}`
  const { data, error } = await admin().rpc('claim_skill_candidates', {
    p_statuses: statuses,
    p_limit: Math.min(Math.max(limit, 1), 250),
    p_worker_id: workerId,
    p_lease_seconds: CANDIDATE_LEASE_SECONDS,
  })
  if (error) throw new Error(`Candidate claim failed: ${error.message}`)
  return (data || []) as SkillCandidateRow[]
}

async function updateCandidate(id: string, values: Record<string, unknown>) {
  const { error } = await admin()
    .from('skill_candidates')
    .update({ ...values, lease_owner: null, lease_expires_at: null })
    .eq('id', id)
  if (error) throw new Error(`Candidate update failed: ${error.message}`)
}

async function releaseCandidates(ids: string[]) {
  if (!ids.length) return
  const { error } = await admin()
    .from('skill_candidates')
    .update({ lease_owner: null, lease_expires_at: null })
    .in('id', ids)
  if (error) console.warn('[candidate-intake] failed to release unused leases:', error.message)
}

function isGitHubRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /GitHub.*(?:403|429|rate.?limit)|API error:\s*(?:Forbidden|Too Many Requests)|Unable to read.*\((?:403|429)\)/i.test(message)
}

async function findDuplicateContent(sourceKey: string, hash: string, sourceUrl: string) {
  const { data, error } = await admin()
    .from('skill_candidates')
    .select('id, status, published_skill_slug')
    .eq('source_content_hash', hash)
    .neq('source_key', sourceKey)
    .in('status', ['fast_track', 'review_required', 'publishing', 'published', 'publication_error'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Content dedupe lookup failed: ${error.message}`)
  if (data) {
    return {
      candidateId: String(data.id),
      publishedSkillSlug: data.published_skill_slug ? String(data.published_skill_slug) : null,
    }
  }

  const { data: publishedBySource, error: publishedBySourceError } = await admin()
    .from('skills')
    .select('slug')
    .eq('repository', sourceUrl)
    .eq('ai_review_approved', true)
    .limit(1)
    .maybeSingle()
  if (publishedBySourceError) throw new Error(`Published source dedupe lookup failed: ${publishedBySourceError.message}`)
  if (publishedBySource) {
    return { candidateId: null, publishedSkillSlug: String(publishedBySource.slug) }
  }

  const { data: published, error: publishedError } = await admin()
    .from('skills')
    .select('slug')
    .eq('source_content_hash', hash)
    .eq('ai_review_approved', true)
    .limit(1)
    .maybeSingle()
  if (publishedError) throw new Error(`Published content dedupe lookup failed: ${publishedError.message}`)
  return published
    ? { candidateId: null, publishedSkillSlug: String(published.slug) }
    : null
}

async function insertExpandedCandidate(row: Record<string, unknown>) {
  const client = admin()
  const { data, error } = await client
    .from('skill_candidates')
    .upsert(row, { onConflict: 'source_key', ignoreDuplicates: true })
    .select('id, status')
  if (!error) return data || []

  if (error.code !== '23505' || !/skill_candidates_active_content_unique/i.test(error.message)) {
    throw new Error(`Expanded candidate insert failed: ${error.message}`)
  }

  const sourceKey = String(row.source_key || '')
  const hash = String(row.source_content_hash || '')
  const sourceUrl = String(row.canonical_source_url || '')
  const duplicate = await findDuplicateContent(sourceKey, hash, sourceUrl)
  const duplicateRow = {
    ...row,
    status: 'duplicate',
    fast_track_eligible: false,
    requires_ai_review: false,
    duplicate_of: duplicate?.candidateId || null,
    risk_reasons: [duplicate?.candidateId
      ? `Exact content duplicate of candidate ${duplicate.candidateId}`
      : `Exact content already published as ${duplicate?.publishedSkillSlug || 'another listing'}`],
  }
  const { data: duplicateData, error: duplicateError } = await client
    .from('skill_candidates')
    .upsert(duplicateRow, { onConflict: 'source_key', ignoreDuplicates: true })
    .select('id, status')
  if (duplicateError) throw new Error(`Concurrent duplicate insert failed: ${duplicateError.message}`)
  return duplicateData || []
}

async function buildSkillCandidateRow(
  parent: SkillCandidateRow,
  repository: Awaited<ReturnType<typeof validateGitHubRepo>>,
  skill: DiscoveredGitHubSkill,
  repositoryTree: GitHubTreeItem[] | null
) {
  const hash = contentHash(skill.document)
  const sourceKey = buildCandidateSourceKey(repository.id || parent.github_repository_id, repository.fullName, skill.path)
  const license = getLicenseEvidence(skill.frontmatter.license, repository.license)
  const duplicate = await findDuplicateContent(sourceKey, hash, skill.sourceUrl)
  let files: Array<{ path: string; content: string }> = [{ path: skill.path, content: skill.document }]
  let packageTruncated = false
  let hasUnreviewedFiles = false

  if (!duplicate && repository.stars >= 100 && license.status === 'detected') {
    const snapshot = await fetchSkillPackageSnapshot(skill, { maxFiles: 4, repositoryTree })
    files = snapshot.files
    packageTruncated = snapshot.truncated
    hasUnreviewedFiles = snapshot.hasUnreviewedFiles
  }

  const decision = evaluateFastTrackCandidate({
    stars: repository.stars,
    licenseStatus: license.status,
    updatedAt: repository.pushedAt || repository.updatedAt,
    document: skill.document,
    files,
    packageTruncated,
    hasUnreviewedFiles,
  })
  const status: SkillCandidateStatus = duplicate
    ? 'duplicate'
    : license.status === 'missing' || license.status === 'restricted'
      ? 'rejected'
      : decision.eligible
        ? 'fast_track'
        : 'review_required'

  return {
    source_key: sourceKey,
    github_repository_id: repository.id || parent.github_repository_id,
    github_full_name: repository.fullName,
    github_owner: repository.owner,
    github_repo: repository.repo,
    source_ref: skill.ref,
    source_path: skill.path,
    canonical_source_url: skill.sourceUrl,
    source_content_hash: hash,
    skill_name: skill.frontmatter.name,
    skill_description: skill.frontmatter.description,
    github_stars: repository.stars,
    github_updated_at: repository.pushedAt || repository.updatedAt,
    license: license.license,
    license_status: license.status,
    status,
    risk_level: decision.riskLevel,
    risk_reasons: duplicate
      ? [duplicate.candidateId
          ? `Exact content duplicate of candidate ${duplicate.candidateId}`
          : `Exact content already published as ${duplicate.publishedSkillSlug}`]
      : license.status === 'missing' || license.status === 'restricted'
        ? [`License is ${license.status}; automatic publication requires an unrestricted detected license`]
        : decision.reasons,
    has_executable_files: decision.hasExecutableFiles,
    fast_track_eligible: status === 'fast_track',
    requires_ai_review: status === 'review_required',
    duplicate_of: duplicate?.candidateId || null,
    discovery_source: parent.discovery_source,
    discovery_payload: parent.discovery_payload || {},
    validation_payload: {
      parent_candidate_id: parent.id,
      age_days: decision.ageDays,
      tree_source: 'github-api',
    },
    validated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }
}

async function validateRepositoryCandidate(candidate: SkillCandidateRow) {
  try {
    const reference = parseGitHubSkillReference(candidate.canonical_source_url)
    if (!reference) throw new Error('Invalid canonical GitHub source')
    const repository = await validateGitHubRepo(candidate.github_full_name, {
      checkReadme: true,
      checkSkillJson: false,
    })
    if (!meetsAutomaticDiscoveryStarFloor(repository.stars)) {
      await updateCandidate(candidate.id, {
        status: 'rejected',
        github_stars: repository.stars,
        risk_reasons: [`Automatic discovery requires at least ${AUTOMATIC_DISCOVERY_MIN_STARS} GitHub stars`],
        validated_at: new Date().toISOString(),
        last_error: null,
      })
      return { expanded: 0, fastTrack: 0, reviewRequired: 0, duplicates: 0, rejected: 1, errors: 0 }
    }
    const discovery = await discoverGitHubSkills(reference, repository)

    if (!discovery.skills.length) {
      await updateCandidate(candidate.id, {
        status: 'rejected',
        risk_reasons: ['No valid SKILL.md document found'],
        validated_at: new Date().toISOString(),
        last_error: null,
      })
      return { expanded: 0, fastTrack: 0, reviewRequired: 0, duplicates: 0, rejected: 1, errors: 0 }
    }

    const rows = []
    for (const skill of discovery.skills.slice(0, 20)) {
      rows.push(await buildSkillCandidateRow(candidate, repository, skill, discovery.tree))
    }
    const data = (await Promise.all(rows.map(insertExpandedCandidate))).flat()

    await updateCandidate(candidate.id, {
      status: 'expanded',
      github_repository_id: repository.id || candidate.github_repository_id,
      github_stars: repository.stars,
      github_updated_at: repository.pushedAt || repository.updatedAt,
      validated_at: new Date().toISOString(),
      validation_payload: {
        discovered_skills: discovery.skills.length,
        inserted_skills: data.length,
        tree_truncated: discovery.truncated,
      },
      last_error: null,
    })

    const inserted = data
    return {
      expanded: inserted.length,
      fastTrack: inserted.filter((row) => row.status === 'fast_track').length,
      reviewRequired: inserted.filter((row) => row.status === 'review_required').length,
      duplicates: inserted.filter((row) => row.status === 'duplicate').length,
      rejected: inserted.filter((row) => row.status === 'rejected').length,
      errors: 0,
    }
  } catch (error) {
    const rateLimited = isGitHubRateLimitError(error)
    const delayMinutes = rateLimited ? 60 : Math.min(360, 5 * 2 ** Math.min(candidate.attempt_count, 6))
    await updateCandidate(candidate.id, {
      status: !rateLimited && candidate.attempt_count >= 4 ? 'rejected' : 'validation_error',
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      last_error: error instanceof Error ? error.message.slice(0, 1000) : 'Candidate validation failed',
    })
    return { expanded: 0, fastTrack: 0, reviewRequired: 0, duplicates: 0, rejected: 0, errors: 1, rateLimited }
  }
}

export async function runCandidateValidationBatch(limit = 12) {
  const startedAt = Date.now()
  const candidates = await claimCandidates(['discovered', 'validation_error'], limit, 'candidate-validator')
  const totals = { claimed: candidates.length, processed: 0, expanded: 0, fastTrack: 0, reviewRequired: 0, duplicates: 0, rejected: 0, errors: 0, rateLimited: false, timeBudgetReached: false }

  for (let offset = 0; offset < candidates.length; offset += VALIDATION_CONCURRENCY) {
    if (Date.now() - startedAt >= WORKER_TIME_BUDGET_MS) {
      totals.timeBudgetReached = true
      await releaseCandidates(candidates.slice(offset).map((candidate) => candidate.id))
      break
    }
    const chunk = candidates.slice(offset, offset + VALIDATION_CONCURRENCY)
    const results = await Promise.all(chunk.map(validateRepositoryCandidate))
    totals.processed += chunk.length
    for (const result of results) {
      for (const key of ['expanded', 'fastTrack', 'reviewRequired', 'duplicates', 'rejected', 'errors'] as const) {
        totals[key] += result[key]
      }
      if ('rateLimited' in result && result.rateLimited) totals.rateLimited = true
    }
    if (totals.rateLimited) {
      await releaseCandidates(candidates.slice(offset + chunk.length).map((candidate) => candidate.id))
      break
    }
    if (offset + chunk.length < candidates.length) await sleep(VALIDATION_CHUNK_DELAY_MS)
  }
  return totals
}

async function publishCandidate(candidate: SkillCandidateRow) {
  try {
    await updateCandidate(candidate.id, { status: 'publishing', last_error: null })
    const result = await syncRepositorySkills({
      reference: candidate.canonical_source_url,
      discoverySource: candidate.fast_track_eligible ? 'github-fast-track' : 'github-candidate-review',
      maxSkills: 1,
      minimumStarsForNew: AUTOMATIC_DISCOVERY_MIN_STARS,
      reviewMode: candidate.fast_track_eligible ? 'fast-track' : 'ai',
      discoveryMetadata: {
        candidate_id: candidate.id,
        risk_level: candidate.risk_level,
        risk_reasons: candidate.risk_reasons,
        fast_track: candidate.fast_track_eligible,
      },
    })
    const successful = result.entries.find((entry) => entry.status === 'created' || entry.status === 'updated')
    if (!successful) {
      const failure = result.entries.find((entry) => entry.reason)
      const reason = failure?.reason || 'Candidate did not pass publication review'
      const retryable = Boolean(failure?.retryable)
      const shouldRetry = retryable && candidate.attempt_count < 4
      await updateCandidate(candidate.id, {
        status: shouldRetry ? 'publication_error' : 'rejected',
        next_attempt_at: shouldRetry
          ? new Date(Date.now() + Math.min(360, 15 * 2 ** Math.min(candidate.attempt_count, 4)) * 60_000).toISOString()
          : new Date().toISOString(),
        last_error: reason.slice(0, 1000),
      })
      if (shouldRetry) return { status: 'retry' as const, slug: null }
      return { status: 'rejected' as const, slug: null }
    }

    await updateCandidate(candidate.id, {
      status: 'published',
      published_skill_slug: successful.slug,
      published_at: new Date().toISOString(),
      last_error: null,
    })
    return { status: 'published' as const, slug: successful.slug }
  } catch (error) {
    const rateLimited = isGitHubRateLimitError(error)
    const delayMinutes = rateLimited ? 60 : Math.min(360, 5 * 2 ** Math.min(candidate.attempt_count, 6))
    await updateCandidate(candidate.id, {
      status: !rateLimited && candidate.attempt_count >= 4 ? 'rejected' : 'publication_error',
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      last_error: error instanceof Error ? error.message.slice(0, 1000) : 'Candidate publication failed',
    })
    return { status: 'error' as const, slug: null, rateLimited }
  }
}

async function countRecentApprovedSkills() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await admin()
    .from('skills')
    .select('id', { count: 'exact', head: true })
    .eq('ai_review_approved', true)
    .gte('created_at', since)
  if (error) throw new Error(`Daily publication count failed: ${error.message}`)
  return count || 0
}

export async function runCandidatePublicationBatch(options: {
  fastTrackLimit?: number
  aiReviewLimit?: number
  dailyTarget?: number
} = {}) {
  const startedAt = Date.now()
  const fastTrackLimit = Math.min(Math.max(options.fastTrackLimit ?? 12, 1), 50)
  const aiReviewLimit = Math.min(Math.max(options.aiReviewLimit ?? 4, 0), 25)
  const dailyTarget = Math.min(Math.max(options.dailyTarget ?? PUBLICATION_DAILY_TARGET, 1), 10_000)
  const publishedLast24Hours = await countRecentApprovedSkills()
  const remainingDailyTarget = Math.max(dailyTarget - publishedLast24Hours, 0)
  const batchBudget = Math.min(remainingDailyTarget, fastTrackLimit + aiReviewLimit)

  if (batchBudget === 0) {
    return {
      claimed: 0,
      processed: 0,
      fastTrackClaimed: 0,
      aiReviewClaimed: 0,
      retryClaimed: 0,
      timeBudgetReached: false,
      published: 0,
      rejected: 0,
      retries: 0,
      errors: 0,
      rateLimited: false,
      dailyTarget,
      publishedLast24Hours,
      remainingDailyTarget,
      targetReached: true,
      slugs: [] as string[],
    }
  }

  const retryLimit = Math.min(4, batchBudget)
  const retries = await claimCandidates(['publication_error', 'publishing'], retryLimit, 'candidate-publication-retry')
  const fastTrackBudget = Math.min(fastTrackLimit, batchBudget - retries.length)
  const fastTrack = fastTrackBudget > 0
    ? await claimCandidates(['fast_track'], fastTrackBudget, 'candidate-fast-publisher')
    : []
  const reviewBudget = Math.min(aiReviewLimit, batchBudget - retries.length - fastTrack.length)
  const reviewed = reviewBudget > 0
    ? await claimCandidates(['review_required'], reviewBudget, 'candidate-ai-publisher')
    : []
  const claimed = [...retries, ...fastTrack, ...reviewed]
  const results = []
  let timeBudgetReached = false
  for (let index = 0; index < claimed.length; index += 1) {
    if (Date.now() - startedAt >= WORKER_TIME_BUDGET_MS) {
      timeBudgetReached = true
      await releaseCandidates(claimed.slice(index).map((candidate) => candidate.id))
      break
    }
    const result = await publishCandidate(claimed[index])
    results.push(result)
    if ('rateLimited' in result && result.rateLimited) {
      await releaseCandidates(claimed.slice(index + 1).map((candidate) => candidate.id))
      break
    }
    if (index + 1 < claimed.length) await sleep(PUBLICATION_DELAY_MS)
  }

  const published = results.filter((result) => result.status === 'published').length
  return {
    claimed: claimed.length,
    processed: results.length,
    fastTrackClaimed: fastTrack.length,
    aiReviewClaimed: reviewed.length,
    retryClaimed: retries.length,
    timeBudgetReached,
    published,
    rejected: results.filter((result) => result.status === 'rejected').length,
    retries: results.filter((result) => result.status === 'retry').length,
    errors: results.filter((result) => result.status === 'error').length,
    rateLimited: results.some((result) => 'rateLimited' in result && result.rateLimited),
    dailyTarget,
    publishedLast24Hours,
    remainingDailyTarget: Math.max(remainingDailyTarget - published, 0),
    targetReached: publishedLast24Hours + published >= dailyTarget,
    slugs: results.map((result) => result.slug).filter((slug): slug is string => Boolean(slug)),
  }
}

async function fetchCandidatePipelineHealth(now = new Date()): Promise<CandidatePipelineHealth> {
  const client = createAdminClient({ requestTimeoutMs: 6_000 })
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const entriesPromise = Promise.all(CANDIDATE_PIPELINE_STATUSES.map(async (status) => {
    const { count, error } = await client.from('skill_candidates').select('id', { count: 'exact', head: true }).eq('status', status)
    if (error) throw new Error(error.message)
    return [status, count || 0] as const
  }))
  const [
    entries,
    discoveredResult,
    publishedResult,
    oldestReadyResult,
    latestCandidateResult,
    latestPublicationResult,
  ] = await Promise.all([
    entriesPromise,
    client.from('skill_candidates').select('id', { count: 'exact', head: true }).gte('discovered_at', since),
    client.from('skill_candidates').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', since),
    client
      .from('skill_candidates')
      .select('discovered_at')
      .in('status', READY_CANDIDATE_STATUSES)
      .lte('next_attempt_at', now.toISOString())
      .order('discovered_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    client
      .from('skill_candidates')
      .select('discovered_at')
      .order('discovered_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('skill_candidates')
      .select('published_at')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  for (const result of [discoveredResult, publishedResult, oldestReadyResult, latestCandidateResult, latestPublicationResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const counts = Object.fromEntries(entries) as Record<SkillCandidateStatus, number>
  const readyBacklog = READY_CANDIDATE_STATUSES.reduce((sum, status) => sum + counts[status], 0)
  const errorsWaitingRetry = counts.validation_error + counts.publication_error
  const oldestReadyCandidateAt = oldestReadyResult.data?.discovered_at || null
  const oldestReadyAgeHours = oldestReadyCandidateAt
    ? Math.max(0, Math.round((now.getTime() - Date.parse(oldestReadyCandidateAt)) / 3_600_000))
    : null
  const discoveredLast24Hours = discoveredResult.count || 0
  const publishedLast24Hours = publishedResult.count || 0
  const publicationAttainmentPercent = Number(
    ((publishedLast24Hours / PUBLICATION_DAILY_TARGET) * 100).toFixed(1)
  )
  const estimatedDaysToClearReadyBacklog = publishedLast24Hours > 0
    ? Number((readyBacklog / publishedLast24Hours).toFixed(1))
    : null
  const errorShare = readyBacklog > 0 ? errorsWaitingRetry / readyBacklog : 0
  const state: CandidatePipelineHealth['state'] =
    errorsWaitingRetry >= 20 && errorShare >= 0.25
      ? 'degraded'
      : readyBacklog >= PUBLICATION_DAILY_TARGET * 3 ||
          (readyBacklog >= 100 && (oldestReadyAgeHours || 0) >= 24)
        ? 'backlogged'
        : discoveredLast24Hours === 0 && publishedLast24Hours === 0
          ? 'idle'
          : 'healthy'

  return {
    state,
    counts,
    total_candidates: CANDIDATE_PIPELINE_STATUSES.reduce((sum, status) => sum + counts[status], 0),
    ready_backlog: readyBacklog,
    errors_waiting_retry: errorsWaitingRetry,
    discovered_last_24_hours: discoveredLast24Hours,
    published_last_24_hours: publishedLast24Hours,
    publication_target_per_24_hours: PUBLICATION_DAILY_TARGET,
    publication_attainment_percent: publicationAttainmentPercent,
    publication_gap: Math.max(PUBLICATION_DAILY_TARGET - publishedLast24Hours, 0),
    estimated_days_to_clear_ready_backlog: estimatedDaysToClearReadyBacklog,
    oldest_ready_candidate_at: oldestReadyCandidateAt,
    oldest_ready_age_hours: oldestReadyAgeHours,
    latest_candidate_at: latestCandidateResult.data?.discovered_at || null,
    latest_publication_at: latestPublicationResult.data?.published_at || null,
  }
}

export const getCandidatePipelineHealth = unstable_cache(
  fetchCandidatePipelineHealth,
  ['candidate-pipeline-health-v1'],
  { revalidate: 300, tags: ['candidate-pipeline-health'] }
)

export async function getCandidatePipelineStats() {
  return (await getCandidatePipelineHealth()).counts
}
