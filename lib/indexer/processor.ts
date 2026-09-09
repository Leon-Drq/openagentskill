/**
 * Skill Processor for Auto-Indexer
 *
 * For each candidate repository, runs the pipeline:
 *   1. Fetch repo metadata + README from GitHub
 *   2. AI quality review via Vercel AI Gateway
 *   3. Write to Supabase through a narrow INDEXER_SECRET-guarded RPC
 */

import { createHash } from 'node:crypto'
import { createPublicClient } from '@/lib/supabase/public'
import type { CandidateRepo } from './github-search'
import { evaluateSkillCandidate, isMcpCandidate } from './skill-filter'
import { syncRepositorySkills } from './repository-skill-sync'
import { AUTOMATIC_DISCOVERY_MIN_STARS } from './intake-policy'

const GITHUB_REQUEST_TIMEOUT_MS = 12_000
const GITHUB_RETRY_DELAYS_MS = [750, 1_750]
const DEFAULT_AI_REVIEW_TIMEOUT_MS = 12_000
const MAX_AI_REVIEW_TIMEOUT_MS = 20_000
const INDEXER_DB_TIMEOUT_MS = 12_000

const GITHUB_HEADERS = () => ({
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'OpenAgentSkill-Indexer/1.0',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
})

export interface ProcessResult {
  repo: string
  status: 'indexed' | 'rejected' | 'error' | 'skipped'
  reason?: string
  slug?: string
  slugs?: string[]
  indexedSkills?: number
  updatedSkills?: number
  discoverySource?: string
}

// ─── GitHub helpers ───────────────────────────────────────────────────────────

interface GitHubRepoMetadata {
  description: string | null
  stargazers_count: number
  forks_count: number
  language: string | null
  pushed_at: string | null
  license: { spdx_id: string | null } | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestGitHub(url: string, headers: HeadersInit) {
  let lastNetworkError: unknown

  for (let attempt = 0; attempt <= GITHUB_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
      })

      const retryable = [429, 502, 503, 504].includes(response.status)
      if (response.ok || !retryable || attempt === GITHUB_RETRY_DELAYS_MS.length) {
        return response
      }

      const retryAfterSeconds = Number(response.headers.get('retry-after'))
      const fallbackDelay = GITHUB_RETRY_DELAYS_MS[attempt]
      const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.min(retryAfterSeconds * 1_000, 10_000)
        : fallbackDelay
      await sleep(retryDelay)
    } catch (error) {
      lastNetworkError = error
      if (attempt === GITHUB_RETRY_DELAYS_MS.length) throw error
      await sleep(GITHUB_RETRY_DELAYS_MS[attempt])
    }
  }

  throw lastNetworkError instanceof Error
    ? lastNetworkError
    : new Error('GitHub request failed after retries')
}

async function fetchRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
  const res = await requestGitHub(`https://api.github.com/repos/${owner}/${repo}`, GITHUB_HEADERS())
  if (!res.ok) throw new Error(`GitHub repo fetch failed: ${res.status}`)
  return res.json() as Promise<GitHubRepoMetadata>
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await requestGitHub(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    ...GITHUB_HEADERS(),
    Accept: 'application/vnd.github.v3.raw',
  })
  if (res.status === 404) return ''
  if (!res.ok) throw new Error(`GitHub README fetch failed: ${res.status}`)
  return res.text()
}

// ─── AI Review ────────────────────────────────────────────────────────────────

interface ReviewResult {
  approved: boolean
  score: number        // 0-100
  category: string
  tags: string[]
  summary: string
  reason?: string
}

export interface ProcessRepoOptions {
  aiReviewTimeoutMs?: number
}

function resolveAiReviewTimeoutMs(value?: number) {
  const configured = value ?? Number(process.env.INDEXER_AI_REVIEW_TIMEOUT_MS)
  if (!Number.isFinite(configured)) return DEFAULT_AI_REVIEW_TIMEOUT_MS
  return Math.min(Math.max(Math.floor(configured), 3_000), MAX_AI_REVIEW_TIMEOUT_MS)
}

async function aiReview(_candidate: CandidateRepo, _readme: string, _timeoutMs: number): Promise<ReviewResult> {
  // No SKILL.md was found by sourceSync. README classification cannot establish installability.
  return { approved: false, score: 0, category: 'utility', tags: [], summary: '', reason: 'An explicit SKILL.md package is required; no paid README classification was performed.' }
}

// ─── Main processor ───────────────────────────────────────────────────────────

export async function processRepo(
  candidate: CandidateRepo,
  options: ProcessRepoOptions = {}
): Promise<ProcessResult> {
  const { owner, repo } = candidate
  const repoRef = `${owner}/${repo}`
  const slug = `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const discoverySource = candidate.discovery?.source

  try {
    const serverSecret = process.env.INDEXER_SECRET
    if (!serverSecret) {
      throw new Error('Missing INDEXER_SECRET for controlled indexer writes.')
    }

    if (isMcpCandidate({
      fullName: candidate.fullName,
      name: candidate.repo,
      description: candidate.description,
      topics: candidate.topics || [],
      language: candidate.language,
    })) {
      return { repo: repoRef, slug, discoverySource, status: 'skipped', reason: 'MCP projects are excluded from skill-only imports' }
    }

    // Explicit SKILL.md packages are the strongest intake signal. Split them
    // into individual listings before applying repository-level star gates or
    // duplicate checks. This keeps zero-star skills eligible and lets an
    // already-known repository publish newly added nested skill directories.
    const sourceSync = await syncRepositorySkills({
      reference: candidate.skillSourceUrl || candidate.htmlUrl || `https://github.com/${repoRef}`,
      discoverySource: discoverySource === 'x-radar' ? 'x-skill-radar' : 'recursive-skill-source-sync',
      ...(candidate.discovery?.x ? { discoveryMetadata: { x_signal: candidate.discovery.x } } : {}),
      ...(candidate.requestedSkillName ? { skillNames: [candidate.requestedSkillName] } : {}),
      maxSkills: 8,
      minimumStarsForNew: AUTOMATIC_DISCOVERY_MIN_STARS,
    })
    if (sourceSync.discovered > 0) {
      const successfulEntries = sourceSync.entries.filter((entry) => entry.status === 'created' || entry.status === 'updated')
      const slugs = successfulEntries.map((entry) => entry.slug)
      const firstSlug = slugs[0] || slug

      if (sourceSync.created > 0) {
        return {
          repo: repoRef,
          slug: firstSlug,
          slugs,
          indexedSkills: sourceSync.created,
          updatedSkills: sourceSync.updated,
          discoverySource,
          status: 'indexed',
          reason: `Indexed ${sourceSync.created} new SKILL.md package(s); refreshed ${sourceSync.updated}.`,
        }
      }
      if (sourceSync.updated > 0) {
        return {
          repo: repoRef,
          slug: firstSlug,
          slugs,
          indexedSkills: 0,
          updatedSkills: sourceSync.updated,
          discoverySource,
          status: 'skipped',
          reason: `Refreshed ${sourceSync.updated} existing SKILL.md package(s).`,
        }
      }

      const firstFailure = sourceSync.entries.find((entry) => entry.reason)?.reason
      return {
        repo: repoRef,
        slug,
        discoverySource,
        status: sourceSync.errors > 0 && sourceSync.rejected === 0 ? 'error' : 'rejected',
        reason: firstFailure || 'Explicit SKILL.md packages did not pass automated review.',
      }
    }
    if (candidate.requestedSkillName) {
      return {
        repo: repoRef,
        slug,
        discoverySource,
        status: 'skipped',
        reason: `Requested skill ${candidate.requestedSkillName} was not found in the repository.`,
      }
    }

    const supabase = createPublicClient({ requestTimeoutMs: INDEXER_DB_TIMEOUT_MS })
    const repoMeta = await fetchRepoMetadata(owner, repo)
    const stars = repoMeta.stargazers_count ?? candidate.stars
    const forks = repoMeta.forks_count ?? 0
    const license =
      repoMeta.license?.spdx_id && repoMeta.license.spdx_id !== 'NOASSERTION'
        ? repoMeta.license.spdx_id
        : 'Unknown'
    const enrichedCandidate: CandidateRepo = {
      ...candidate,
      description: repoMeta.description || candidate.description,
      stars,
      language: repoMeta.language || candidate.language,
    }

    if (isMcpCandidate({
      fullName: enrichedCandidate.fullName,
      name: enrichedCandidate.repo,
      description: enrichedCandidate.description,
      topics: enrichedCandidate.topics || [],
      language: enrichedCandidate.language,
    })) {
      return { repo: repoRef, slug, discoverySource, status: 'skipped', reason: 'MCP projects are excluded from skill-only imports' }
    }

    if (stars < AUTOMATIC_DISCOVERY_MIN_STARS) {
      return {
        repo: repoRef,
        slug,
        discoverySource,
        status: 'skipped',
        reason: `Below ${AUTOMATIC_DISCOVERY_MIN_STARS}-star automatic discovery gate`,
      }
    }

    if (license === 'Unknown') {
      return { repo: repoRef, slug, discoverySource, status: 'skipped', reason: 'License is missing or unclear' }
    }

    // 1. Check if already indexed — if so, refresh star count and return
    const { data: existing } = await supabase
      .from('skills')
      .select('id, github_stars')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      const { error: refreshError } = await supabase.rpc('update_skill_github_metadata', {
        p_server_secret: serverSecret,
        p_slug: slug,
        p_github_stars: stars,
        p_github_forks: forks,
        p_github_language: repoMeta.language,
        p_github_last_pushed_at: repoMeta.pushed_at,
      })

      if (refreshError) {
        throw new Error(`DB metadata refresh failed: ${refreshError.message}`)
      }

      if (existing.github_stars !== stars) {
        return { repo: repoRef, slug, discoverySource, status: 'skipped', reason: `Stars refreshed: ${existing.github_stars} → ${stars}` }
      }
      return { repo: repoRef, slug, discoverySource, status: 'skipped', reason: 'Already indexed, metadata refreshed' }
    }

    // 2. Fetch README
    const readme = await fetchReadme(owner, repo)
    if (!readme) {
      return { repo: repoRef, slug, discoverySource, status: 'skipped', reason: 'No README' }
    }

    const heuristic = evaluateSkillCandidate({
      fullName: enrichedCandidate.fullName,
      name: enrichedCandidate.repo,
      description: `${enrichedCandidate.description || ''}\n${readme.slice(0, 1200)}`,
      topics: enrichedCandidate.topics || [],
      language: enrichedCandidate.language,
      stars,
    })
    if (!heuristic.accepted || heuristic.skillLikenessScore < 45) {
      return {
        repo: repoRef,
        slug,
        discoverySource,
        status: 'rejected',
        reason: `Not specific enough for OpenAgentSkill import (${heuristic.skillLikenessScore}/100)`,
      }
    }

    // 3. AI Review
    const review = await aiReview(enrichedCandidate, readme, resolveAiReviewTimeoutMs(options.aiReviewTimeoutMs))

    if (!review.approved) {
      return { repo: repoRef, slug, discoverySource, status: 'rejected', reason: review.reason || 'Did not pass review' }
    }

    // 4. Write to skills table
    const skillData = {
      slug,
      name: repo.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: review.summary,
      long_description: readme.slice(0, 2000),
      tagline: enrichedCandidate.description || review.summary,
      author_name: owner,
      author_url: `https://github.com/${owner}`,
      repository: `https://github.com/${owner}/${repo}`,
      github_repo: repoRef,
      github_stars: stars,
      github_forks: forks,
      github_language: repoMeta.language,
      github_last_pushed_at: repoMeta.pushed_at,
      category: review.category,
      tags: review.tags,
      frameworks: repoMeta.language ? [repoMeta.language] : [],
      version: 'Unknown',
      license,
      install_command: `npx skills add ${repoRef}`,
      verified: stars >= 100,
      submission_source: discoverySource === 'x-radar' ? 'x-skill-radar' : 'auto-indexer',
      submitted_by_agent: discoverySource === 'x-radar' ? 'open-agent-skill-x-radar' : 'open-agent-skill-indexer',
      ai_review_score: { total: review.score },
      ai_review_approved: true,
      ai_review_issues: [],
      ai_review_suggestions: [],
      source_content_hash: createHash('sha256').update(readme).digest('hex'),
      downloads: 0,
      used_by: 0,
      rating: 0,
      review_count: 0,
    }

    const { error: skillError } = await supabase.rpc('upsert_indexed_skill', {
      p_server_secret: serverSecret,
      p_skill: skillData,
      p_activity: {
        event_type: 'skill_published',
        actor_name: 'OpenAgentSkill Indexer',
        actor_type: 'agent',
        description: `Auto-indexed ${skillData.name} from GitHub (${stars} stars)`,
        metadata: { stars, source: discoverySource === 'x-radar' ? 'x-skill-radar' : 'auto-indexer', score: review.score },
      },
    })

    if (skillError) throw new Error(`DB insert failed: ${skillError.message}`)

    // Editorial generation is intentionally handled by the dedicated SEO cron.
    // Leaving it out of the ingestion request keeps hourly discovery bounded.

    return { repo: repoRef, status: 'indexed', slug, discoverySource }
  } catch (error: unknown) {
    return {
      repo: repoRef,
      slug,
      discoverySource,
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unknown indexer error',
    }
  }
}

export async function processBatch(
  candidates: CandidateRepo[],
  concurrency = 2
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []

  for (let i = 0; i < candidates.length; i += concurrency) {
    const chunk = candidates.slice(i, i + concurrency)
    const chunkResults = await Promise.all(chunk.map((candidate) => processRepo(candidate)))
    results.push(...chunkResults)

    // Respect GitHub rate limits
    if (i + concurrency < candidates.length) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  return results
}
