/**
 * Skill Processor for Auto-Indexer
 *
 * For each candidate repository, runs the full pipeline:
 *   1. Validate GitHub repo
 *   2. Fetch README + manifest + code files
 *   3. Static security analysis
 *   4. AI review
 *   5. Write to database
 */

import {
  validateGitHubRepo,
  fetchReadme,
  fetchSkillManifest,
  fetchCodeFiles,
} from '@/lib/github/api'
import { reviewSkill } from '@/lib/ai-review/reviewer'
import { analyzeCode } from '@/lib/security/static-analysis'
import { createSkill, createSubmissionRecord } from '@/lib/db/skills'
import { createActivity } from '@/lib/db/activity'
import type { CandidateRepo } from './github-search'

export interface ProcessResult {
  repo: string
  status: 'indexed' | 'rejected' | 'error' | 'skipped'
  reason?: string
  skillId?: string
}

/**
 * Process a single candidate repository through the full pipeline.
 */
export async function processRepo(candidate: CandidateRepo): Promise<ProcessResult> {
  const { owner, repo } = candidate
  const repoRef = `${owner}/${repo}`

  try {
    // Step 1: Validate
    const repoData = await validateGitHubRepo(repoRef)

    if (!repoData.hasReadme) {
      return { repo: repoRef, status: 'skipped', reason: 'No README found' }
    }

    // Step 2: Fetch content
    const [readmeContent, manifestData, codeFiles] = await Promise.all([
      fetchReadme(owner, repo),
      fetchSkillManifest(owner, repo).catch(() => null),
      fetchCodeFiles(owner, repo, 5).catch(() => []),
    ])

    // Step 3: Static security analysis
    const staticResult = analyzeCode(
      codeFiles.map((f: { path: string; content: string }) => ({
        path: f.path,
        content: f.content,
      }))
    )

    if (!staticResult.passed) {
      return {
        repo: repoRef,
        status: 'rejected',
        reason: `Static analysis failed: ${staticResult.issues.join(', ')}`,
      }
    }

    // Step 4: AI Review
    const review = await reviewSkill({
      repository: repoData.fullName,
      readmeContent,
      codeFiles,
      manifestData,
      githubStats: {
        stars: repoData.stars,
        forks: repoData.forks,
        lastUpdated: repoData.updatedAt,
      },
    })

    if (!review.approved) {
      return {
        repo: repoRef,
        status: 'rejected',
        reason: `AI review rejected (score: ${review.totalScore}/40): ${review.issues.join(', ')}`,
      }
    }

    // Step 5: Write to database
    const skillName = manifestData?.name || repo.replace(/-/g, ' ')
    const slug = `${owner}-${repo}`.toLowerCase()
    const category = manifestData?.category || inferCategory(repoData.description, readmeContent)

    const skillRecord = await createSkill({
      slug,
      name: skillName,
      description: manifestData?.description || repoData.description || '',
      long_description: readmeContent.slice(0, 1000),
      tagline: manifestData?.tagline || repoData.description || '',
      author_name: owner,
      author_url: `https://github.com/${owner}`,
      repository: `https://github.com/${owner}/${repo}`,
      github_repo: repoRef,
      github_stars: repoData.stars,
      github_forks: repoData.forks,
      category,
      tags: manifestData?.tags || inferTags(repoData.language, repoData.description),
      frameworks: manifestData?.frameworks || [],
      version: manifestData?.version || '1.0.0',
      license: repoData.license || 'Unknown',
      install_command: `npx skills add ${repoRef}`,
      verified: review.totalScore >= 35,
      submission_source: 'auto-indexer',
      submitted_by_agent: 'open-agent-skill-indexer',
      ai_review_score: review.scores,
      ai_review_approved: review.approved,
      ai_review_issues: review.issues,
      ai_review_suggestions: review.suggestions,
    })

    // Submission record
    await createSubmissionRecord({
      skill_id: skillRecord.id,
      github_repo: repoRef,
      submission_source: 'auto-indexer',
      submitted_by_agent: 'open-agent-skill-indexer',
      ai_review_result: review,
      status: 'approved',
    })

    // Activity feed entry
    await createActivity({
      event_type: 'skill_published',
      skill_id: skillRecord.id,
      actor_name: 'Open Agent Skill Indexer',
      actor_type: 'agent',
      description: `Auto-indexed ${skillName} from GitHub — ${repoData.description || ''}`,
      metadata: { stars: repoData.stars, source: 'auto-indexer' },
    })

    return { repo: repoRef, status: 'indexed', skillId: skillRecord.id }
  } catch (error: any) {
    return { repo: repoRef, status: 'error', reason: error.message }
  }
}

/**
 * Process a batch of candidates with a concurrency limit.
 */
export async function processBatch(
  candidates: CandidateRepo[],
  concurrency = 3
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []

  for (let i = 0; i < candidates.length; i += concurrency) {
    const chunk = candidates.slice(i, i + concurrency)
    const chunkResults = await Promise.all(chunk.map(processRepo))
    results.push(...chunkResults)

    // Brief pause between chunks to respect GitHub rate limits
    if (i + concurrency < candidates.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  return results
}

// --- Helpers ---

function inferCategory(description: string, readme: string): string {
  const text = `${description} ${readme}`.toLowerCase()
  if (text.includes('web scraping') || text.includes('crawl') || text.includes('browser')) return 'data'
  if (text.includes('search') || text.includes('retrieval') || text.includes('rag')) return 'data'
  if (text.includes('code') || text.includes('programming') || text.includes('developer')) return 'development'
  if (text.includes('image') || text.includes('vision') || text.includes('screenshot')) return 'media'
  if (text.includes('email') || text.includes('calendar') || text.includes('slack')) return 'productivity'
  if (text.includes('security') || text.includes('auth') || text.includes('encrypt')) return 'security'
  return 'utility'
}

function inferTags(language: string | null, description: string): string[] {
  const tags: string[] = []
  if (language) tags.push(language.toLowerCase())
  const keywords = ['mcp', 'llm', 'agent', 'automation', 'api', 'scraping', 'search', 'rag']
  const text = description.toLowerCase()
  keywords.forEach((kw) => { if (text.includes(kw)) tags.push(kw) })
  return [...new Set(tags)].slice(0, 5)
}
