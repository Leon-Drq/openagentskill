import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateGitHubRepo, GitHubAPIError } from '@/lib/github/api'
import { discoverGitHubSkills, parseGitHubSkillReference } from '@/lib/github/skill-source'
import { buildRequestFingerprint, enforceValidationRateLimit } from '@/lib/skills/open-submission'

export const runtime = 'nodejs'

const ValidateRequestSchema = z.object({
  repository: z.string().trim().min(1).max(500),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = ValidateRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, code: 'REPOSITORY_REQUIRED', error: 'A GitHub repository or SKILL.md URL is required.' },
        { status: 400 }
      )
    }

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = forwardedFor || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    await enforceValidationRateLimit(buildRequestFingerprint(ip, userAgent))

    const reference = parseGitHubSkillReference(parsed.data.repository)
    if (!reference) {
      return NextResponse.json(
        { valid: false, code: 'INVALID_REPOSITORY', error: 'Enter a GitHub repository, skill directory, or SKILL.md URL.' },
        { status: 400 }
      )
    }

    const repoData = await validateGitHubRepo(`${reference.owner}/${reference.repo}`, {
      checkReadme: false,
      checkSkillJson: false,
    })
    const discovery = await discoverGitHubSkills(reference, repoData)
    if (discovery.skills.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          code: 'MISSING_SKILL_FILE',
          error: 'No valid SKILL.md with name and description frontmatter was found at this source.',
          stars: repoData.stars,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      repository: {
        owner: repoData.owner,
        repo: repoData.repo,
        fullName: repoData.fullName,
        stars: repoData.stars,
        forks: repoData.forks,
        defaultBranch: repoData.defaultBranch,
        hasReadme: repoData.hasReadme,
      },
      stars: repoData.stars,
      zeroStarEligible: true,
      treeTruncated: discovery.truncated,
      skills: discovery.skills.map((skill) => ({
        name: skill.frontmatter.name,
        description: skill.frontmatter.description,
        path: skill.path,
        ref: skill.ref,
        sourceUrl: skill.sourceUrl,
      })),
    })
  } catch (error) {
    console.error('[skill-validation] error:', error)
    if (error instanceof GitHubAPIError) {
      return NextResponse.json(
        { valid: false, code: 'GITHUB_ERROR', error: error.message },
        { status: error.statusCode || 400 }
      )
    }
    if (error instanceof Error && error.name === 'ValidationRateLimitError') {
      return NextResponse.json(
        { valid: false, code: 'RATE_LIMITED', error: error.message },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }
    return NextResponse.json(
      { valid: false, code: 'VALIDATION_FAILED', error: error instanceof Error ? error.message : 'Validation failed.' },
      { status: 500 }
    )
  }
}
