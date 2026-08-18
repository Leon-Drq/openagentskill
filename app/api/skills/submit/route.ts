import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateGitHubRepo, GitHubAPIError } from '@/lib/github/api'
import {
  discoverGitHubSkills,
  fetchSkillPackageFiles,
  parseGitHubSkillReference,
} from '@/lib/github/skill-source'
import {
  buildRequestFingerprint,
  createOpenSubmission,
  reviewOpenSubmission,
} from '@/lib/skills/open-submission'

export const runtime = 'nodejs'
export const maxDuration = 60

const githubHandle = z.string().trim().max(39).regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/)
const xHandle = z.string().trim().max(15).regex(/^[A-Za-z0-9_]{1,15}$/)

const SkillSubmitRequestSchema = z.object({
  repository: z.string().trim().min(1).max(500),
  skillPath: z.string().trim().min(1).max(500),
  sourceRef: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  makerGithub: githubHandle.optional().or(z.literal('')).transform((value) => value || undefined),
  makerX: xHandle.optional().or(z.literal('')).transform((value) => value || undefined),
  submissionSource: z.enum(['web', 'api', 'agent']).default('web'),
  submittedByAgent: z.string().trim().min(1).max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = SkillSubmitRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'INVALID_SUBMISSION',
          error: 'Invalid submission payload.',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const body = parsed.data
    const reference = parseGitHubSkillReference(body.repository)
    if (!reference) {
      return NextResponse.json(
        { code: 'INVALID_REPOSITORY', error: 'Enter a GitHub repository, skill directory, or SKILL.md URL.' },
        { status: 400 }
      )
    }

    const selectedReference = {
      ...reference,
      ref: body.sourceRef || reference.ref,
      path: body.skillPath,
    }
    const repository = await validateGitHubRepo(`${reference.owner}/${reference.repo}`, {
      checkReadme: false,
      checkSkillJson: false,
    })
    const discovery = await discoverGitHubSkills(selectedReference, repository)
    const skill = discovery.skills.find((candidate) => candidate.path === body.skillPath)
    if (!skill) {
      return NextResponse.json(
        { code: 'SKILL_PATH_NOT_FOUND', error: 'The selected SKILL.md path no longer exists or is invalid.' },
        { status: 400 }
      )
    }

    const codeFiles = await fetchSkillPackageFiles(skill)
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = forwardedFor || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const submissionInput = {
      repository,
      skill,
      category: body.category,
      tags: body.tags,
      submissionSource: body.submissionSource,
      submittedByAgent: body.submittedByAgent,
      makerGithub: body.makerGithub,
      makerX: body.makerX,
      requestFingerprint: buildRequestFingerprint(ip, userAgent),
      codeFiles,
    }
    const receipt = await createOpenSubmission(submissionInput)

    if (receipt.status === 'submitted') {
      after(() => reviewOpenSubmission(submissionInput, receipt.id))
    }

    return NextResponse.json(
      {
        success: true,
        accepted: true,
        message: receipt.status === 'quarantined'
          ? 'Submission saved but quarantined by the critical-risk scanner.'
          : 'Submission saved. Automated review continues in the background.',
        submission: {
          id: receipt.id,
          token: receipt.token,
          status: receipt.status,
          skill: receipt.skill,
          statusUrl: `/api/skills/submissions/${receipt.id}?token=${receipt.token}`,
        },
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[skill-submission] error:', error)
    if (error instanceof GitHubAPIError) {
      return NextResponse.json(
        { code: 'GITHUB_ERROR', error: error.message },
        { status: error.statusCode || 400 }
      )
    }
    if (error instanceof Error && error.name === 'SubmissionRateLimitError') {
      return NextResponse.json(
        { code: 'RATE_LIMITED', error: error.message },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }
    return NextResponse.json(
      { code: 'SUBMISSION_FAILED', error: error instanceof Error ? error.message : 'Submission failed.' },
      { status: 500 }
    )
  }
}
