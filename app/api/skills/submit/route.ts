import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  validateGitHubRepo,
  fetchReadme,
  fetchSkillManifest,
  fetchCodeFiles,
  parseGitHubUrl,
} from '@/lib/github/api'
import { reviewSkill } from '@/lib/ai-review/reviewer'
import { analyzeCode } from '@/lib/security/static-analysis'
import {
  evaluateSkillSubmissionPolicy,
  SKILL_SUBMISSION_MIN_STARS,
} from '@/lib/skills/submission-policy'
import { createPublicClient } from '@/lib/supabase/public'

const SkillSubmitRequestSchema = z.object({
  repository: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string().min(1).max(40)).min(1).max(10),
  submissionSource: z.enum(['web', 'api', 'agent']).default('web'),
  submittedByAgent: z.string().min(1).max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = SkillSubmitRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid submission payload',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const body = parsed.data
    const { repository, category, tags, submissionSource } = body

    console.log('[v0] Skill submission received:', { repository, category, tags })

    // Parse GitHub URL
    const repoRef = parseGitHubUrl(repository)
    if (!repoRef) {
      return NextResponse.json(
        { code: 'INVALID_REPOSITORY', error: 'Invalid GitHub repository format' },
        { status: 400 }
      )
    }

    const { owner, repo } = repoRef

    // Step 1: Validate GitHub repository
    console.log('[v0] Validating repository...')
    const repoData = await validateGitHubRepo(repository)

    // Enforce minimum star threshold (also checked client-side but enforced here)
    if (repoData.stars < SKILL_SUBMISSION_MIN_STARS) {
      return NextResponse.json(
        {
          code: 'MINIMUM_STARS',
          error: `This repository has ${repoData.stars} stars and does not meet the minimum requirement of ${SKILL_SUBMISSION_MIN_STARS} stars.`,
          stars: repoData.stars,
          minStars: SKILL_SUBMISSION_MIN_STARS,
        },
        { status: 400 }
      )
    }

    if (!repoData.hasReadme) {
      return NextResponse.json(
        { code: 'MISSING_README', error: 'This repository does not have a README.' },
        { status: 400 }
      )
    }

    // Step 2: Fetch repository content
    console.log('[v0] Fetching repository content...')
    const [readmeContent, manifestData, codeFiles] = await Promise.all([
      fetchReadme(owner, repo),
      fetchSkillManifest(owner, repo).catch(() => null),
      fetchCodeFiles(owner, repo).catch(() => []),
    ])

    // Step 3: Static security analysis
    console.log('[v0] Running static analysis...')
    const staticResult = analyzeCode(
      codeFiles.map((f: { path: string; content: string }) => ({
        path: f.path,
        content: f.content,
      }))
    )

    if (!staticResult.passed) {
      return NextResponse.json(
        {
          error: 'Skill rejected: critical security issues detected',
          issues: staticResult.issues,
          riskLevel: staticResult.riskLevel,
        },
        { status: 400 }
      )
    }

    // Step 4: AI Review
    console.log('[v0] Starting AI review...')
    const review = await reviewSkill({
      repository: repoData.fullName,
      readmeContent,
      codeFiles,
      manifestData,
      githubStats: {
        stars: repoData.stars,
        forks: repoData.forks,
        lastUpdated: repoData.updatedAt,
        license: repoData.license,
        language: repoData.language,
      },
    })

    console.log('[v0] AI review completed:', {
      approved: review.approved,
      totalScore: review.totalScore,
    })

    const policy = evaluateSkillSubmissionPolicy({
      stars: repoData.stars,
      hasReadme: repoData.hasReadme,
      staticAnalysis: staticResult,
      review,
    })
    const reviewedResult = {
      ...review,
      approved: policy.approved,
      issues: policy.issues,
      suggestions: policy.suggestions,
      policy,
    }

    if (!policy.approved) {
      return NextResponse.json({
        success: false,
        approved: false,
        review: reviewedResult,
        policy,
        error:
          policy.status === 'manual_review'
            ? 'Skill requires manual review before publishing'
            : 'Skill did not pass the automatic submission gate',
      })
    }

    // Step 4: Create skill object
    const skillName = manifestData?.name || repo.replace(/-/g, ' ')
    const slug = `${owner}-${repo}`.toLowerCase()

    const newSkill = {
      id: `skill-${Date.now()}`,
      slug,
      name: skillName,
      tagline: manifestData?.description || repoData.description || '',
      description: manifestData?.description || repoData.description || '',
      longDescription: readmeContent.slice(0, 500),
      category,
      tags,
      author: {
        id: `author-${owner}`,
        name: owner,
        username: owner,
        reputation: 0,
        skillCount: 1,
        verified: false,
      },
      stats: {
        downloads: 0,
        stars: repoData.stars,
        forks: repoData.forks,
        usedBy: 0,
        rating: 0,
        reviewCount: 0,
      },
      technical: {
        version: manifestData?.version || '1.0.0',
        language: repoData.language ? [repoData.language] : [],
        frameworks: manifestData?.frameworks || [],
        dependencies: [],
        documentation: `https://github.com/${owner}/${repo}`,
        repository: `https://github.com/${owner}/${repo}`,
        license: repoData.license || 'Unknown',
        size: '0 MB',
        lastUpdated: repoData.updatedAt,
        installCommand: `npx skills add ${owner}/${repo}`,
        githubRepo: `${owner}/${repo}`,
      },
      pricing: {
        type: 'free' as const,
      },
      compatibility: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featured: false,
      verified: policy.verified,
    }

    try {
      const serverSecret = process.env.INDEXER_SECRET
      if (!serverSecret) {
        throw new Error('Missing INDEXER_SECRET for reviewed skill submission.')
      }

      const supabase = createPublicClient()
      const activity = {
        event_type: submissionSource === 'agent' ? 'agent_submitted' : 'skill_published',
        actor_name: submissionSource === 'agent' ? (body.submittedByAgent || 'Unknown Agent') : owner,
        actor_type: submissionSource === 'agent' ? 'agent' : 'human',
        description: `${submissionSource === 'agent' ? 'Discovered and submitted' : 'Published'} ${skillName} — ${repoData.description || ''}`,
        metadata: {
          stars: repoData.stars,
          source: submissionSource,
          static_analysis: staticResult,
          submission_policy: policy,
        },
      }

      const { data: saveResult, error: saveError } = await supabase.rpc('submit_reviewed_skill', {
        p_server_secret: serverSecret,
        p_skill: {
          slug,
          name: skillName,
          description: manifestData?.description || repoData.description || '',
          long_description: readmeContent.slice(0, 1000),
          tagline: manifestData?.tagline || repoData.description || '',
          author_name: owner,
          author_url: `https://github.com/${owner}`,
          repository: `https://github.com/${owner}/${repo}`,
          github_repo: `${owner}/${repo}`,
          github_stars: repoData.stars,
          github_forks: repoData.forks,
          category,
          tags,
          frameworks: manifestData?.frameworks || [],
          version: manifestData?.version || '1.0.0',
          license: repoData.license || 'Unknown',
          install_command: `npx skills add ${owner}/${repo}`,
          verified: policy.verified,
          submission_source: submissionSource,
          submitted_by_agent: body.submittedByAgent,
          ai_review_score: review.scores,
          ai_review_approved: policy.approved,
          ai_review_issues: policy.issues,
          ai_review_suggestions: policy.suggestions,
        },
        p_submission: {
          github_repo: `${owner}/${repo}`,
          submission_source: submissionSource,
          submitted_by_agent: body.submittedByAgent,
          ai_review_result: reviewedResult,
          status: policy.status,
        },
        p_activity: activity,
      })

      if (saveError) {
        throw saveError
      }

      const skillRecord = saveResult?.skill
      if (!skillRecord?.id) {
        throw new Error('Reviewed skill submission did not return a skill record.')
      }

      console.log('[v0] Skill saved to database:', skillRecord.id)

      return NextResponse.json({
        success: true,
        approved: policy.approved,
        review: reviewedResult,
        policy,
        skill: {
          ...newSkill,
          id: skillRecord.id,
        },
      })
    } catch (dbError: any) {
      console.error('[v0] Database save error:', dbError)

      if (dbError?.code === '23505') {
        return NextResponse.json(
          {
            code: 'SKILL_ALREADY_EXISTS',
            error: 'Skill already exists',
            slug,
          },
          { status: 409 }
        )
      }

      return NextResponse.json({
        code: 'SAVE_FAILED',
        success: false,
        approved: policy.approved,
        review: reviewedResult,
        policy,
        error: 'Skill reviewed but database save failed',
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[v0] Submission error:', error)

    return NextResponse.json(
      {
        code: 'SUBMISSION_FAILED',
        error: error.message || 'Submission failed. Please try again later.',
      },
      { status: 500 }
    )
  }
}
