/**
 * Skill Processor for Auto-Indexer
 *
 * For each candidate repository, runs the pipeline:
 *   1. Fetch repo metadata + README from GitHub
 *   2. AI quality review via Vercel AI Gateway
 *   3. Write to Supabase through a narrow INDEXER_SECRET-guarded RPC
 */

import { createPublicClient } from '@/lib/supabase/public'
import { generateText } from 'ai'
import type { CandidateRepo } from './github-search'
import { evaluateSkillCandidate, isMcpCandidate } from './skill-filter'
import { INDEXER_REVIEW_MODEL } from '@/lib/ai/models'

const GITHUB_REQUEST_TIMEOUT_MS = 12_000
const DEFAULT_AI_REVIEW_TIMEOUT_MS = 12_000
const MAX_AI_REVIEW_TIMEOUT_MS = 20_000

const GITHUB_HEADERS = () => ({
  Accept: 'application/vnd.github.v3+json',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
})

export interface ProcessResult {
  repo: string
  status: 'indexed' | 'rejected' | 'error' | 'skipped'
  reason?: string
  slug?: string
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

async function fetchRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: GITHUB_HEADERS(),
    signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`GitHub repo fetch failed: ${res.status}`)
  return res.json() as Promise<GitHubRepoMetadata>
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: { ...GITHUB_HEADERS(), Accept: 'application/vnd.github.v3.raw' },
    signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) return ''
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

async function aiReview(
  candidate: CandidateRepo,
  readme: string,
  timeoutMs = DEFAULT_AI_REVIEW_TIMEOUT_MS
): Promise<ReviewResult> {
  const prompt = `You are an AI curator for OpenAgentSkill, a registry of reusable AI agent skills. MCP servers are out of scope for this product.

Evaluate this GitHub repository and decide if it should be listed:

Repo: ${candidate.fullName}
Description: ${candidate.description}
Stars: ${candidate.stars}
Language: ${candidate.language || 'unknown'}

README (first 1500 chars):
${readme.slice(0, 1500)}

Rules:
- APPROVE only if: it is explicitly an installable AI agent skill, a SKILL.md repository/collection, or a domain workflow packaged for agents such as Claude Code, Codex, Cursor, Gemini CLI, or similar agent runtimes.
- REJECT if: it is a generic framework/library/platform, MCP server, Model Context Protocol integration, demo/tutorial/example repo, broad awesome list, foundation AI project, infrastructure project, or has no clear agent installation/use path.
- REJECT PyTorch, Kubernetes, TensorFlow, React, Next.js, LangChain-style generic frameworks unless the README clearly packages reusable agent skills.
- REJECT if license is missing or unclear, README is thin, or it has under 10 stars.
- Score 0-100 based on direct skill specificity, documentation, installability, maintenance, and usefulness.
- Pick ONE category from: coding-agents, research, finance-quant, presentation, design-creative, web-scraping, data, marketing-growth, sports-analytics, security, productivity, utility.
- Pick 1-5 relevant tags

Respond with JSON only, no markdown:
{"approved":boolean,"score":number,"category":"string","tags":["string"],"summary":"one sentence description","reason":"brief reason if rejected"}`

  try {
    const { text } = await generateText({
      model: INDEXER_REVIEW_MODEL,
      prompt,
      temperature: 0.2,
      maxRetries: 0,
      timeout: timeoutMs,
    })
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')
    return JSON.parse(match[0]) as ReviewResult
  } catch {
    // If AI fails, stay conservative: approve only direct skill-like repos.
    const evaluation = evaluateSkillCandidate({
      fullName: candidate.fullName,
      name: candidate.repo,
      description: `${candidate.description || ''}\n${readme.slice(0, 1000)}`,
      topics: candidate.topics || [],
      language: candidate.language,
      stars: candidate.stars,
    })
    const approved = candidate.stars >= 10 && evaluation.accepted && evaluation.skillLikenessScore >= 55
    return {
      approved,
      score: approved ? Math.max(60, evaluation.skillLikenessScore) : 30,
      category: 'utility',
      tags: [...evaluation.signals.slice(0, 4), candidate.language?.toLowerCase()].filter(Boolean) as string[],
      summary: candidate.description || candidate.repo,
      reason: approved ? undefined : 'AI review unavailable and repo is not direct skill-like enough',
    }
  }
}

// ─── Main processor ───────────────────────────────────────────────────────────

export async function processRepo(
  candidate: CandidateRepo,
  options: ProcessRepoOptions = {}
): Promise<ProcessResult> {
  const { owner, repo } = candidate
  const repoRef = `${owner}/${repo}`
  const slug = `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  try {
    const serverSecret = process.env.INDEXER_SECRET
    if (!serverSecret) {
      throw new Error('Missing INDEXER_SECRET for controlled indexer writes.')
    }

    const supabase = createPublicClient()
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
      return { repo: repoRef, status: 'skipped', reason: 'MCP projects are excluded from skill-only imports' }
    }

    if (stars < 10) {
      return { repo: repoRef, status: 'skipped', reason: 'Below 10-star quality gate' }
    }

    if (license === 'Unknown') {
      return { repo: repoRef, status: 'skipped', reason: 'License is missing or unclear' }
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
        return { repo: repoRef, status: 'skipped', reason: `Stars refreshed: ${existing.github_stars} → ${stars}` }
      }
      return { repo: repoRef, status: 'skipped', reason: 'Already indexed, metadata refreshed' }
    }

    // 2. Fetch README
    const readme = await fetchReadme(owner, repo)
    if (!readme) {
      return { repo: repoRef, status: 'skipped', reason: 'No README' }
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
        status: 'rejected',
        reason: `Not specific enough for OpenAgentSkill import (${heuristic.skillLikenessScore}/100)`,
      }
    }

    // 3. AI Review
    const review = await aiReview(enrichedCandidate, readme, resolveAiReviewTimeoutMs(options.aiReviewTimeoutMs))

    if (!review.approved) {
      return { repo: repoRef, status: 'rejected', reason: review.reason || 'Did not pass review' }
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
      version: '1.0.0',
      license,
      install_command: `npx skills add ${repoRef}`,
      verified: stars >= 100,
      submission_source: 'auto-indexer',
      submitted_by_agent: 'open-agent-skill-indexer',
      ai_review_score: { total: review.score },
      ai_review_approved: true,
      ai_review_issues: [],
      ai_review_suggestions: [],
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
        metadata: { stars, source: 'auto-indexer', score: review.score },
      },
    })

    if (skillError) throw new Error(`DB insert failed: ${skillError.message}`)

    // Editorial generation is intentionally handled by the dedicated SEO cron.
    // Leaving it out of the ingestion request keeps hourly discovery bounded.

    return { repo: repoRef, status: 'indexed', slug }
  } catch (error: unknown) {
    return {
      repo: repoRef,
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
