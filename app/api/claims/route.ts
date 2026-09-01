import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CLAIM_CHALLENGE_TTL_MS,
  createClaimChallenge,
  getClaimChallengePath,
  getGitHubIdentity,
  hashClaimChallenge,
  parseSkillRepository,
} from '@/lib/creator-ownership'

const ClaimSchema = z.object({
  skill_slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9][a-z0-9-]*$/),
  github_username: z.string().trim().max(39).regex(/^$|^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/i).optional().default(''),
  x_username: z.string().trim().max(15).regex(/^$|^[a-z0-9_]{1,15}$/i).optional().default(''),
  evidence_url: z.union([z.literal(''), z.string().url().max(500)]).nullable().optional(),
  evidence_note: z.string().trim().max(2000).nullable().optional(),
})

const CLAIM_SELECT = [
  'id', 'skill_slug', 'github_username', 'x_username', 'repo_url',
  'evidence_url', 'evidence_note', 'verification_method', 'verification_tier',
  'verified_at', 'challenge_expires_at', 'status', 'created_at', 'updated_at',
].join(',')

export async function GET(request: NextRequest) {
  const skillSlug = request.nextUrl.searchParams.get('skill_slug')
  if (!skillSlug) return NextResponse.json({ error: 'Missing skill_slug' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('skill_claims')
    .select(CLAIM_SELECT)
    .eq('skill_slug', skillSlug)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Failed to load claim' }, { status: 500 })
  return NextResponse.json({ claim: data || null })
}

export async function POST(request: NextRequest) {
  const parsed = ClaimSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid claim payload' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient({ requestTimeoutMs: 15_000 })
  const { data: skill, error: skillError } = await admin
    .from('skills')
    .select('slug,name,repository,github_repo,ai_review_approved')
    .eq('slug', parsed.data.skill_slug)
    .eq('ai_review_approved', true)
    .maybeSingle()
  if (skillError || !skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  const repository = parseSkillRepository(skill.repository, skill.github_repo)
  if (!repository) return NextResponse.json({ error: 'This listing has no verifiable GitHub source.' }, { status: 422 })

  const githubIdentity = getGitHubIdentity(user)
  const requestedGitHub = parsed.data.github_username.replace(/^@/, '').toLowerCase()
  const githubUsername = (githubIdentity?.username || requestedGitHub || repository.owner).toLowerCase()
  const xUsername = parsed.data.x_username.replace(/^@/, '').toLowerCase() || null
  const oauthOwnerMatch = Boolean(
    githubIdentity && githubIdentity.username.toLowerCase() === repository.owner.toLowerCase()
  )
  const challenge = oauthOwnerMatch ? null : createClaimChallenge()
  const challengePath = getClaimChallengePath(skill.slug)
  const now = new Date()
  const challengeExpiresAt = challenge ? new Date(now.getTime() + CLAIM_CHALLENGE_TTL_MS).toISOString() : null

  const profilePayload: Record<string, unknown> = {
    id: user.id,
    display_name: user.email?.split('@')[0] || githubUsername || xUsername || 'Creator',
    github_username: githubUsername || null,
    x_username: xUsername,
    twitter: xUsername ? `https://x.com/${xUsername}` : null,
    updated_at: now.toISOString(),
  }
  if (githubIdentity) {
    const githubId = Number(githubIdentity.id)
    profilePayload.github_user_id = Number.isSafeInteger(githubId) ? githubId : null
    profilePayload.github_verified_at = now.toISOString()
    if (githubIdentity.avatarUrl) profilePayload.avatar_url = githubIdentity.avatarUrl
  }
  const { error: profileError } = await admin.from('profiles').upsert(profilePayload)
  if (profileError) return NextResponse.json({ error: 'Failed to prepare creator profile' }, { status: 500 })

  const { data: existing } = await admin
    .from('skill_claims')
    .select('id,status')
    .eq('skill_slug', skill.slug)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing?.status === 'approved') {
    const { data: approvedClaim } = await admin.from('skill_claims').select(CLAIM_SELECT).eq('id', existing.id).single()
    return NextResponse.json({ ok: true, claim: approvedClaim, alreadyVerified: true })
  }

  const status = oauthOwnerMatch ? 'approved' : 'pending'
  const { data: claim, error: claimError } = await admin
    .from('skill_claims')
    .upsert({
      skill_slug: skill.slug,
      user_id: user.id,
      github_username: githubUsername || null,
      x_username: xUsername,
      repo_url: `https://github.com/${repository.owner}/${repository.repo}`,
      verification_method: oauthOwnerMatch ? 'github_oauth' : 'repository_file',
      verification_tier: 'maintainer',
      verified_at: oauthOwnerMatch ? now.toISOString() : null,
      evidence_url: parsed.data.evidence_url || skill.repository,
      evidence_note: parsed.data.evidence_note || null,
      challenge_token_hash: challenge ? hashClaimChallenge(challenge) : null,
      challenge_expires_at: challengeExpiresAt,
      status,
      reviewer_note: null,
      metadata: {
        source: 'skill_detail_page',
        repository_owner: repository.owner,
        challenge_path: challengePath,
        github_oauth_owner_match: oauthOwnerMatch,
      },
      updated_at: now.toISOString(),
    }, { onConflict: 'skill_slug,user_id' })
    .select(CLAIM_SELECT)
    .single()

  if (claimError) return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 })

  if (status === 'approved') {
    await admin.from('skills').update({
      author_user_id: user.id,
      publisher_github: githubUsername,
      publisher_x: xUsername,
      publisher_verified: true,
    }).eq('slug', skill.slug)
  }

  await admin.from('skill_events').insert({
    skill_slug: skill.slug,
    event_type: 'claim_submit',
    user_id: user.id,
    path: `/skills/${skill.slug}`,
    source: 'creator_claim',
    is_verified: false,
    metadata: { verification_method: oauthOwnerMatch ? 'github_oauth' : 'repository_file' },
  })

  return NextResponse.json({
    ok: true,
    claim,
    challenge: challenge ? {
      token: challenge,
      path: challengePath,
      expires_at: challengeExpiresAt,
      repository: `https://github.com/${repository.owner}/${repository.repo}`,
    } : null,
  })
}
