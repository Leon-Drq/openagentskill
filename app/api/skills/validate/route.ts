import { NextRequest, NextResponse } from 'next/server'
import { validateGitHubRepo, GitHubAPIError } from '@/lib/github/api'
import { SKILL_SUBMISSION_MIN_STARS } from '@/lib/skills/submission-policy'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repository } = body

    if (!repository) {
      return NextResponse.json(
        { code: 'REPOSITORY_REQUIRED', error: 'GitHub repository URL is required' },
        { status: 400 }
      )
    }

    // Validate GitHub repository
    const repoData = await validateGitHubRepo(repository)

    // Check minimum star threshold
    if (repoData.stars < SKILL_SUBMISSION_MIN_STARS) {
      return NextResponse.json(
        {
          valid: false,
          code: 'MINIMUM_STARS',
          error: `This repository has ${repoData.stars} stars and does not meet the minimum requirement of ${SKILL_SUBMISSION_MIN_STARS} stars.`,
          stars: repoData.stars,
          minStars: SKILL_SUBMISSION_MIN_STARS,
        },
        { status: 400 }
      )
    }

    // Check basic requirements
    if (!repoData.hasReadme) {
      return NextResponse.json(
        { 
          valid: false,
          code: 'MISSING_README',
          error: 'This repository does not have a README. Add one and try again.'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      repository: repoData,
      stars: repoData.stars,
      minStars: SKILL_SUBMISSION_MIN_STARS,
    })
  } catch (error) {
    console.error('[v0] Validation error:', error)

    if (error instanceof GitHubAPIError) {
      return NextResponse.json(
        { valid: false, error: error.message },
        { status: error.statusCode || 400 }
      )
    }

    return NextResponse.json(
      { code: 'VALIDATION_FAILED', valid: false, error: 'Validation failed. Please try again later.' },
      { status: 500 }
    )
  }
}
