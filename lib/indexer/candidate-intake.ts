import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { getLicenseEvidence } from '@/lib/creator-ownership'
import { validateGitHubRepo } from '@/lib/github/api'
import {
  discoverGitHubSkills,
  fetchSkillPackageSnapshot,
  parseGitHubSkillReference,
  type DiscoveredGitHubSkill,
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

  for (const candidate of candidates) {
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
  if (!rows.length) return { attempted: 0, inserted: 0, duplicates: 0 }

  const { data, error } = await admin()
    .from('skill_candidates')
    .upsert(rows, { onConflict: 'source_key', ignoreDuplicates: true })
    .select('id')
  if (error) throw new Error(`Candidate enqueue failed: ${error.message}`)

  const inserted = data?.length || 0
  return { attempted: rows.length, inserted, duplicates: rows.length - inserted }
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
  skill: DiscoveredGitHubSkill
) {
  const hash = contentHash(skill.document)
  const sourceKey = buildCandidateSourceKey(repository.id || parent.github_repository_id, repository.fullName, skill.path)
  const license = getLicenseEvidence(skill.frontmatter.license, repository.license)
  const duplicate = await findDuplicateContent(sourceKey, hash, skill.sourceUrl)
  let files: Array<{ path: string; content: string }> = [{ path: skill.path, content: skill.document }]
  let packageTruncated = false
  let hasUnreviewedFiles = false

  if (!duplicate && repository.stars >= 100 && license.status === 'detected') {
    const snapshot = await fetchSkillPackageSnapshot(skill, { maxFiles: 4 })
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
      rows.push(await buildSkillCandidateRow(candidate, repository, skill))
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
      const reason = result.entries.find((entry) => entry.reason)?.reason || 'Candidate did not pass publication review'
      await updateCandidate(candidate.id, { status: 'rejected', last_error: reason.slice(0, 1000) })
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

export async function runCandidatePublicationBatch(options: { fastTrackLimit?: number; aiReviewLimit?: number } = {}) {
  const startedAt = Date.now()
  const fastTrackLimit = Math.min(Math.max(options.fastTrackLimit ?? 12, 1), 50)
  const aiReviewLimit = Math.min(Math.max(options.aiReviewLimit ?? 4, 0), 25)
  const fastTrack = await claimCandidates(['fast_track'], fastTrackLimit, 'candidate-fast-publisher')
  const reviewed = aiReviewLimit > 0
    ? await claimCandidates(['review_required'], aiReviewLimit, 'candidate-ai-publisher')
    : []
  const retries = await claimCandidates(['publication_error', 'publishing'], Math.min(10, fastTrackLimit), 'candidate-publication-retry')
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

  return {
    claimed: claimed.length,
    processed: results.length,
    fastTrackClaimed: fastTrack.length,
    aiReviewClaimed: reviewed.length,
    retryClaimed: retries.length,
    timeBudgetReached,
    published: results.filter((result) => result.status === 'published').length,
    rejected: results.filter((result) => result.status === 'rejected').length,
    errors: results.filter((result) => result.status === 'error').length,
    rateLimited: results.some((result) => 'rateLimited' in result && result.rateLimited),
    slugs: results.map((result) => result.slug).filter((slug): slug is string => Boolean(slug)),
  }
}

export async function getCandidatePipelineStats() {
  const client = admin()
  const statuses: SkillCandidateStatus[] = [
    'discovered', 'fast_track', 'review_required', 'published', 'duplicate',
    'rejected', 'validation_error', 'publication_error',
  ]
  const entries = await Promise.all(statuses.map(async (status) => {
    const { count, error } = await client.from('skill_candidates').select('id', { count: 'exact', head: true }).eq('status', status)
    if (error) throw new Error(error.message)
    return [status, count || 0] as const
  }))
  return Object.fromEntries(entries) as Record<SkillCandidateStatus, number>
}
