import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { PUBLIC_SKILL_FILTER } from '@/lib/skills/publication'
import {
  buildCreatorDirectory,
  FEATURED_CREATORS,
  type CreatorClaim,
  type CreatorProfile,
  type CreatorSkill,
} from '@/lib/creator-directory'

const getPublishedSkills = unstable_cache(
  async () => {
    const db = createPublicClient({ requestTimeoutMs: 4500 })
    const repos = [
      ...new Set(
        FEATURED_CREATORS.flatMap((c) =>
          c.repositories.flatMap((r) => [r.fullName, r.fullName.toLowerCase()]),
        ),
      ),
    ]
    const { data, error } = await db
      .from('skills')
      .select(
        'slug,name,github_repo,repository,github_stars,last_synced_at,github_last_pushed_at,ai_review_approved,listing_status',
      )
      .in('github_repo', repos)
      .or(PUBLIC_SKILL_FILTER)
      .order('slug')
      .limit(1000)
    if (error || !data || data.length === 1000)
      throw new Error('Creator skill directory unavailable or truncated')
    return data as CreatorSkill[]
  },
  ['featured-creator-skills-v1'],
  { revalidate: 3600, tags: ['creator-directory'] },
)

const getClaims = unstable_cache(
  async () => {
    const db = createPublicClient({ requestTimeoutMs: 4500 })
    const { data: claims, error } = await db
      .from('skill_claims')
      .select('user_id,skill_slug,status,verified_at')
      .eq('status', 'approved')
      .limit(1000)
    if (error || !claims || claims.length === 1000)
      throw new Error('Creator ownership directory unavailable or truncated')
    if (!claims.length)
      return { claims: [] as CreatorClaim[], profiles: [] as CreatorProfile[] }
    const { data: profiles, error: profileError } = await db
      .from('profiles')
      .select('id,username,github_username,github_verified_at')
      .in('id', [...new Set(claims.map((c) => c.user_id))])
      .not('username', 'is', null)
    if (profileError) throw new Error('Creator identity directory unavailable')
    return {
      claims: claims as CreatorClaim[],
      profiles: (profiles || []) as CreatorProfile[],
    }
  },
  ['featured-creator-claims-v1'],
  { revalidate: 300, tags: ['creator-directory'] },
)

export async function getCreatorDirectory() {
  const [skills, ownership] = await Promise.allSettled([
    getPublishedSkills(),
    getClaims(),
  ])
  const ownershipData =
    ownership.status === 'fulfilled'
      ? ownership.value
      : { claims: [], profiles: [] }
  return {
    entries: buildCreatorDirectory(
      skills.status === 'fulfilled' ? skills.value : [],
      ownershipData.claims,
      ownershipData.profiles,
    ),
    registryAvailable: skills.status === 'fulfilled',
    ownershipAvailable: ownership.status === 'fulfilled',
    // Keep existing claimed profile URLs discoverable, including creators outside the editorial selection.
    profiles: ownershipData.profiles.filter((p) =>
      ownershipData.claims.some((c) => c.user_id === p.id),
    ),
  }
}
