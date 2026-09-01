import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  challengeMatches,
  fetchRepositoryChallenge,
  getClaimChallengePath,
  parseSkillRepository,
} from '@/lib/creator-ownership'
import { validateGitHubRepo } from '@/lib/github/api'

const VerifySchema = z.object({
  skill_slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9][a-z0-9-]*$/),
})

export async function POST(request: NextRequest) {
  const parsed = VerifySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient({ requestTimeoutMs: 15_000 })
  const { data: claim } = await admin
    .from('skill_claims')
    .select('id,skill_slug,user_id,status,github_username,x_username,challenge_token_hash,challenge_expires_at')
    .eq('skill_slug', parsed.data.skill_slug)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  if (claim.status === 'approved') return NextResponse.json({ ok: true, alreadyVerified: true })
  if (!claim.challenge_token_hash || !claim.challenge_expires_at) {
    return NextResponse.json({ error: 'Create a fresh repository challenge first.' }, { status: 409 })
  }
  if (Date.parse(claim.challenge_expires_at) <= Date.now()) {
    return NextResponse.json({ error: 'Challenge expired. Generate a new challenge.' }, { status: 410 })
  }

  const { data: skill } = await admin
    .from('skills')
    .select('repository,github_repo')
    .eq('slug', claim.skill_slug)
    .maybeSingle()
  const repository = parseSkillRepository(skill?.repository, skill?.github_repo)
  if (!repository) return NextResponse.json({ error: 'Repository source is unavailable.' }, { status: 422 })

  const repo = await validateGitHubRepo(`${repository.owner}/${repository.repo}`, {
    checkReadme: false,
    checkSkillJson: false,
  }).catch(() => null)
  if (!repo) return NextResponse.json({ error: 'Could not read the GitHub repository.' }, { status: 502 })

  const challengePath = getClaimChallengePath(claim.skill_slug)
  const value = await fetchRepositoryChallenge({
    owner: repository.owner,
    repo: repository.repo,
    ref: repository.ref || repo.defaultBranch,
    path: challengePath,
  })
  if (!value || !challengeMatches(value, claim.challenge_token_hash)) {
    return NextResponse.json({
      error: `Verification file not found or token mismatch at ${challengePath}.`,
    }, { status: 422 })
  }

  const verifiedAt = new Date().toISOString()
  const { error } = await admin.from('skill_claims').update({
    status: 'approved',
    verification_method: 'repository_file',
    verification_tier: 'maintainer',
    verified_at: verifiedAt,
    challenge_token_hash: null,
    challenge_expires_at: null,
    reviewer_note: 'Repository ownership challenge verified automatically.',
    updated_at: verifiedAt,
  }).eq('id', claim.id).eq('user_id', user.id).eq('status', 'pending')
  if (error) return NextResponse.json({ error: 'Could not approve the claim.' }, { status: 500 })

  await admin.from('skills').update({
    author_user_id: user.id,
    publisher_github: claim.github_username || repository.owner,
    publisher_x: claim.x_username,
    publisher_verified: true,
  }).eq('slug', claim.skill_slug)

  return NextResponse.json({ ok: true, status: 'approved', verified_at: verifiedAt })
}
