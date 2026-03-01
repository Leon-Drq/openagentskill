/**
 * Skill Processor for Auto-Indexer
 *
 * For each candidate repository, runs the pipeline:
 *   1. Fetch repo metadata + README from GitHub
 *   2. AI quality review (gpt-4o-mini via AI Gateway)
 *   3. Write to Supabase via service-role client (bypasses RLS)
 */

import { createServiceClient } from '@/lib/supabase/public'
import { generateText } from 'ai'
import type { CandidateRepo } from './github-search'

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

async function fetchDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: GITHUB_HEADERS(),
  })
  if (!res.ok) throw new Error(`GitHub repo fetch failed: ${res.status}`)
  const data = await res.json()
  return data.default_branch || 'main'
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: { ...GITHUB_HEADERS(), Accept: 'application/vnd.github.v3.raw' },
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

async function aiReview(candidate: CandidateRepo, readme: string): Promise<ReviewResult> {
  const prompt = `You are an AI curator for Open Agent Skill, a registry of MCP servers and AI agent tools.

Evaluate this GitHub repository and decide if it should be listed:

Repo: ${candidate.fullName}
Description: ${candidate.description}
Stars: ${candidate.stars}
Language: ${candidate.language || 'unknown'}

README (first 1500 chars):
${readme.slice(0, 1500)}

Rules:
- APPROVE if: it is an MCP server, AI agent tool, LLM utility, or automation skill with clear documentation
- REJECT if: it is a demo/tutorial/example repo, has no clear use case, is a fork with no changes, or has under 5 stars unless very unique
- Score 0-100 based on quality, documentation, and usefulness
- Pick ONE category from: data, development, productivity, media, security, utility
- Pick 1-5 relevant tags

Respond with JSON only, no markdown:
{"approved":boolean,"score":number,"category":"string","tags":["string"],"summary":"one sentence description","reason":"brief reason if rejected"}`

  try {
    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
      temperature: 0.2,
    })
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')
    return JSON.parse(match[0]) as ReviewResult
  } catch (err) {
    // If AI fails, do a basic heuristic approval for high-star repos
    const approved = candidate.stars >= 50
    return {
      approved,
      score: approved ? 60 : 30,
      category: 'utility',
      tags: [candidate.language?.toLowerCase() || 'tool'],
      summary: candidate.description || candidate.repo,
      reason: approved ? undefined : 'AI review unavailable, low star count',
    }
  }
}

// ─── Main processor ───────────────────────────────────────────────────────────

export async function processRepo(candidate: CandidateRepo): Promise<ProcessResult> {
  const { owner, repo } = candidate
  const repoRef = `${owner}/${repo}`
  const slug = `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  try {
    const supabase = createServiceClient()

    // 1. Check if already indexed
    const { data: existing } = await supabase
      .from('skills')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return { repo: repoRef, status: 'skipped', reason: 'Already indexed' }
    }

    // 2. Fetch README
    const readme = await fetchReadme(owner, repo)
    if (!readme) {
      return { repo: repoRef, status: 'skipped', reason: 'No README' }
    }

    // 3. AI Review
    const review = await aiReview(candidate, readme)

    if (!review.approved) {
      return { repo: repoRef, status: 'rejected', reason: review.reason || 'Did not pass review' }
    }

    // 4. Write to skills table
    const skillData = {
      slug,
      name: repo.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: review.summary,
      long_description: readme.slice(0, 2000),
      tagline: candidate.description || review.summary,
      author_name: owner,
      author_url: `https://github.com/${owner}`,
      repository: `https://github.com/${owner}/${repo}`,
      github_repo: repoRef,
      github_stars: candidate.stars,
      github_forks: 0,
      category: review.category,
      tags: review.tags,
      frameworks: [],
      version: '1.0.0',
      license: 'Unknown',
      install_command: `npx skills add ${repoRef}`,
      verified: candidate.stars >= 100,
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

    const { data: skillRecord, error: skillError } = await supabase
      .from('skills')
      .insert(skillData)
      .select('id')
      .single()

    if (skillError) throw new Error(`DB insert failed: ${skillError.message}`)

    // 5. Log to activity feed
    await supabase.from('activity_feed').insert({
      event_type: 'skill_published',
      skill_id: skillRecord.id,
      actor_name: 'Open Agent Skill Indexer',
      actor_type: 'agent',
      description: `Auto-indexed ${skillData.name} from GitHub (${candidate.stars} stars)`,
      metadata: { stars: candidate.stars, source: 'auto-indexer', score: review.score },
    })

    return { repo: repoRef, status: 'indexed', slug }
  } catch (error: any) {
    return { repo: repoRef, status: 'error', reason: error.message }
  }
}

export async function processBatch(
  candidates: CandidateRepo[],
  concurrency = 2
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []

  for (let i = 0; i < candidates.length; i += concurrency) {
    const chunk = candidates.slice(i, i + concurrency)
    const chunkResults = await Promise.all(chunk.map(processRepo))
    results.push(...chunkResults)

    // Respect GitHub rate limits
    if (i + concurrency < candidates.length) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  return results
}
