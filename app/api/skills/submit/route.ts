import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateGitHubRepo, fetchRepositoryCommitSha, GitHubAPIError } from '@/lib/github/api'
import {
  discoverGitHubSkills,
  parseGitHubSkillReference,
} from '@/lib/github/skill-source'
import {
  buildRequestFingerprint,
  createOpenSubmission,
  findSubmissionReceipt,
  enforceSubmissionRateLimit,
} from '@/lib/skills/open-submission'
import { processSubmissionJob } from '@/lib/skills/submission-worker'
import { normalizeSocialHandle, validSocialHandle } from '@/lib/skills/submission-contract'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

const githubHandle = z.string().max(200).transform(value => normalizeSocialHandle(value, 'github')).refine(value => validSocialHandle(value, 'github'), 'Enter a GitHub username or profile URL.')
const xHandle = z.string().max(200).transform(value => normalizeSocialHandle(value, 'x')).refine(value => validSocialHandle(value, 'x'), 'Enter an X username or profile URL.')

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
  receiptToken: z.string().regex(/^[a-f0-9]{48}$/).optional(),
})

function accepted(receipt: Awaited<ReturnType<typeof createOpenSubmission>>) {
  return NextResponse.json({ success: true, accepted: true, submission: {
    // Retain the legacy API receipt URL for existing CLI clients. New UI uses an Authorization header.
    ...receipt, statusUrl: `/api/skills/submissions/${receipt.id}?token=${receipt.token}`,
  } }, { status: 202, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}

export async function POST(request: NextRequest) {
  try {
    const parsed = SkillSubmitRequestSchema.safeParse(await request.json().catch(() => null))
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

    if (body.receiptToken) {
      const previous = await findSubmissionReceipt(body.receiptToken, `${reference.owner}/${reference.repo}`, body.skillPath)
      if (previous) return accepted(previous)
    }
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const fingerprint = buildRequestFingerprint(ip, request.headers.get('user-agent') || 'unknown')
    // Reject excess submissions before performing expensive upstream reads.
    await enforceSubmissionRateLimit(fingerprint)

    const selectedReference = {
      ...reference,
      ref: body.sourceRef || reference.ref,
      path: body.skillPath,
    }
    const repository = await validateGitHubRepo(`${reference.owner}/${reference.repo}`, {
      checkReadme: false,
      checkSkillJson: false,
    })
    if (repository.isPrivate) return NextResponse.json({ error: 'Only public repositories can be submitted.' }, { status: 400 })
    const commit = await fetchRepositoryCommitSha(reference.owner, reference.repo, selectedReference.ref || repository.defaultBranch)
    if (!commit) return NextResponse.json({ error: 'Unable to pin the source revision. Please retry later.' }, { status: 503 })
    const discovery = await discoverGitHubSkills({ ...selectedReference, ref: commit }, repository)
    const skill = discovery.skills.find((candidate) => candidate.path === body.skillPath)
    if (!skill) {
      return NextResponse.json(
        { code: 'SKILL_PATH_NOT_FOUND', error: 'The selected SKILL.md path no longer exists or is invalid.' },
        { status: 400 }
      )
    }

    let authenticatedUserId: string | null = null
    // Optional sign-in helps attribution; it is never required or treated as ownership.
    if (request.cookies.getAll().some(cookie => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'))) {
      try { const { data } = await (await createClient()).auth.getUser(); authenticatedUserId = data.user?.id || null } catch { /* anonymous intake still works */ }
    }

    const submissionInput = {
      repository,
      skill,
      category: body.category,
      tags: body.tags,
      submissionSource: body.submissionSource,
      submittedByAgent: body.submittedByAgent,
      makerGithub: body.makerGithub,
      makerX: body.makerX,
      requestFingerprint: fingerprint,
      codeFiles: [{ path: skill.path, content: skill.document }],
      receiptToken: body.receiptToken,
      authenticatedUserId,
    }
    const receipt = await createOpenSubmission(submissionInput)

    if (receipt.status === 'submitted') {
      after(() => processSubmissionJob(receipt.id).catch(() => console.warn('[submission-queue] Immediate worker unavailable; cron will retry')))
    }

    return accepted(receipt)
  } catch (error) {
    console.error('[skill-submission] failed', { kind: error instanceof Error ? error.name : 'SubmissionError' })
    if (error instanceof GitHubAPIError) {
      return NextResponse.json(
        { code: 'GITHUB_ERROR', error: error.message },
        { status: error.statusCode || 400 }
      )
    }
    if (error instanceof Error && error.name === 'SubmissionRateLimitError') {
      return NextResponse.json(
        { code: 'RATE_LIMITED', error: error.message },
        { status: 429, headers: { 'Retry-After': '86400' } }
      )
    }
    return NextResponse.json(
      { code: 'SUBMISSION_FAILED', error: 'Unable to save this submission. Retry with the same receipt; it will not create a duplicate.' },
      { status: 500 }
    )
  }
}
