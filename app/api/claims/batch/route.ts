import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGitHubIdentity, parseSkillRepository } from '@/lib/creator-ownership'

const MAX_BATCH_CLAIMS = 250

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const githubIdentity = getGitHubIdentity(user)
  if (!githubIdentity?.username) {
    return NextResponse.json(
      { error: 'Connect and verify the GitHub account that owns these repositories first.' },
      { status: 409 }
    )
  }

  const admin = createAdminClient({ requestTimeoutMs: 20_000 })
  const githubUsername = githubIdentity.username.toLowerCase()
  const { data: skills, error: skillsError } = await admin
    .from('skills')
    .select('slug,name,repository,github_repo,author_user_id,publisher_verified')
    .eq('ai_review_approved', true)
    .ilike('github_repo', `${githubUsername}/%`)
    .order('github_stars', { ascending: false })
    .limit(MAX_BATCH_CLAIMS)

  if (skillsError) return NextResponse.json({ error: 'Failed to find GitHub-owned skills.' }, { status: 500 })

  const eligible = (skills || []).filter((skill) => {
    const repository = parseSkillRepository(skill.repository, skill.github_repo)
    return repository?.owner.toLowerCase() === githubUsername &&
      (!skill.author_user_id || skill.author_user_id === user.id)
  })

  if (!eligible.length) {
    return NextResponse.json({ ok: true, claimed: 0, skipped: 0, skills: [] })
  }

  const now = new Date().toISOString()
  const githubId = Number(githubIdentity.id)
  const profilePayload: Record<string, unknown> = {
    id: user.id,
    display_name: user.email?.split('@')[0] || githubIdentity.username,
    github_username: githubIdentity.username,
    github_user_id: Number.isSafeInteger(githubId) ? githubId : null,
    github_verified_at: now,
    updated_at: now,
  }
  if (githubIdentity.avatarUrl) profilePayload.avatar_url = githubIdentity.avatarUrl

  const { error: profileError } = await admin.from('profiles').upsert(profilePayload)
  if (profileError) return NextResponse.json({ error: 'Failed to update the creator profile.' }, { status: 500 })

  const claimRows = eligible.map((skill) => ({
    skill_slug: skill.slug,
    user_id: user.id,
    github_username: githubUsername,
    repo_url: skill.repository || `https://github.com/${skill.github_repo}`,
    verification_method: 'github_oauth',
    verification_tier: 'maintainer',
    verified_at: now,
    evidence_url: skill.repository || `https://github.com/${skill.github_repo}`,
    evidence_note: 'Repository ownership verified from the connected GitHub OAuth identity.',
    status: 'approved',
    reviewer_note: null,
    challenge_token_hash: null,
    challenge_expires_at: null,
    metadata: {
      source: 'creator_batch_claim',
      repository_owner: githubUsername,
      github_oauth_owner_match: true,
    },
    updated_at: now,
  }))

  const { error: claimError } = await admin
    .from('skill_claims')
    .upsert(claimRows, { onConflict: 'skill_slug,user_id' })
  if (claimError) return NextResponse.json({ error: 'Failed to claim the selected skills.' }, { status: 500 })

  const slugs = eligible.map((skill) => skill.slug)
  const { error: updateError } = await admin
    .from('skills')
    .update({
      author_user_id: user.id,
      publisher_github: githubUsername,
      publisher_verified: true,
      updated_at: now,
    })
    .in('slug', slugs)
  if (updateError) return NextResponse.json({ error: 'Claims were saved, but listings could not be updated.' }, { status: 500 })

  await admin.from('skill_events').insert(slugs.map((skillSlug) => ({
    skill_slug: skillSlug,
    event_type: 'claim_submit',
    user_id: user.id,
    path: '/creator',
    source: 'creator_batch_claim',
    is_verified: false,
    metadata: { verification_method: 'github_oauth', batch: true },
  })))

  return NextResponse.json({
    ok: true,
    claimed: eligible.length,
    skipped: Math.max(0, (skills || []).length - eligible.length),
    skills: eligible.map((skill) => ({ slug: skill.slug, name: skill.name })),
  })
}
