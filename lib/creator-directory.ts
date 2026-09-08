import catalog from './featured-creators.json' with { type: 'json' }

export type CreatorArea =
  | 'Design'
  | 'Presentations'
  | 'Video'
  | 'Content'
  | 'Data'
  | 'Coding'
  | 'Research'
export type CreatorSort = 'stars' | 'recent' | 'editorial'
export interface CreatorRepository {
  fullName: string
  url: string
  stars: number
  observedAt: string
  pushedAt: string
  description: string
  revision: string
  skillPath: string
  license: string | null
}
export interface FeaturedCreator {
  owner: string
  name: string
  kind: string
  area: string
  githubUrl: string
  checkedAt: string
  repositories: CreatorRepository[]
  preferredSlugs: string[]
}
export interface CreatorSkill {
  slug: string
  name: string
  github_repo: string | null
  repository: string | null
  github_stars: number | null
  last_synced_at: string | null
  github_last_pushed_at: string | null
  ai_review_approved: boolean | null
  listing_status?: string | null
}
export interface CreatorClaim {
  user_id: string
  skill_slug: string
  status?: string
  verified_at?: string | null
}
export interface CreatorProfile {
  id: string
  username: string | null
  github_username: string | null
  github_verified_at: string | null
}
export interface DirectoryCreator extends FeaturedCreator {
  skills: CreatorSkill[]
  stars: number
  statsAsOf: string
  updatedAt: string
  claimedProfile: string | null
  claimedSlugs: string[]
}
export const FEATURED_CREATORS: FeaturedCreator[] = catalog
export const CREATOR_AREAS: CreatorArea[] = [
  'Design',
  'Presentations',
  'Video',
  'Content',
  'Data',
  'Coding',
  'Research',
]
export const creatorHref = (owner: string) =>
  `/creators/github/${encodeURIComponent(owner.toLowerCase())}`
export function isMissingFeaturedCreatorPath(pathname: string) {
  if (!pathname.startsWith('/creators/github/')) return false
  const match = pathname.match(/^\/creators\/github\/([^/]+)\/?$/)
  if (!match) return true
  try {
    const owner = decodeURIComponent(match[1]).toLowerCase()
    return !FEATURED_CREATORS.some(creator => creator.owner.toLowerCase() === owner)
  } catch {
    return true
  }
}
export function repositoryKey(value: string | null | undefined) {
  const cleaned = (value || '')
    .trim()
    .replace(/^https?:\/\/(?:www\.)?github\.com\//i, '')
    .replace(/\.git\/?$/i, '')
    .replace(/\/$/, '')
  return /^[a-z0-9-]+\/[a-z0-9_.-]+$/i.test(cleaned)
    ? cleaned.toLowerCase()
    : ''
}
export function isPublicCreatorSkill(skill: CreatorSkill) {
  return (
    skill.ai_review_approved === true ||
    skill.listing_status === 'owner_published'
  )
}
/** Count repositories, never multiply repository popularity by the number of skills. */
export function repositoryStarTotal(
  repositories: Pick<CreatorRepository, 'fullName' | 'stars' | 'observedAt'>[],
) {
  const latest = new Map<string, (typeof repositories)[number]>()
  for (const repo of repositories) {
    const key = repositoryKey(repo.fullName)
    if (
      key &&
      (!latest.has(key) || repo.observedAt > latest.get(key)!.observedAt)
    )
      latest.set(key, repo)
  }
  return [...latest.values()].reduce(
    (sum, r) => sum + (Number.isFinite(r.stars) ? Math.max(0, r.stars) : 0),
    0,
  )
}
export function buildCreatorDirectory(
  skills: CreatorSkill[] = [],
  claims: CreatorClaim[] = [],
  profiles: CreatorProfile[] = [],
  sources: FeaturedCreator[] = FEATURED_CREATORS,
): DirectoryCreator[] {
  const published = [
    ...new Map(
      skills.filter(isPublicCreatorSkill).map((s) => [s.slug, s]),
    ).values(),
  ]
  return sources.map((source) => {
    const allowed = new Set(
      source.repositories.map((r) => repositoryKey(r.fullName)),
    )
    const owned = published.filter((s) =>
      allowed.has(repositoryKey(s.github_repo)),
    )
    const repositories = source.repositories.map((repo) => {
      const latest = owned
        .filter(
          (s) =>
            repositoryKey(s.github_repo) === repositoryKey(repo.fullName) &&
            s.last_synced_at &&
            Number.isFinite(s.github_stars),
        )
        .sort((a, b) =>
          (b.last_synced_at || '').localeCompare(a.last_synced_at || ''),
        )[0]
      return latest?.last_synced_at &&
        Date.parse(latest.last_synced_at) > Date.parse(repo.observedAt)
        ? {
            ...repo,
            stars: Math.max(0, latest.github_stars!),
            observedAt: latest.last_synced_at,
            pushedAt: latest.github_last_pushed_at || repo.pushedAt,
          }
        : repo
    })
    // A public display name or matching username alone never proves identity.
    const verifiedProfiles = profiles.filter(
      (p) =>
        p.github_verified_at &&
        p.github_username?.toLowerCase() === source.owner.toLowerCase(),
    )
    const ownedSlugs = new Set(owned.map((s) => s.slug))
    const profile = verifiedProfiles.find(
      (p) =>
        p.username &&
        claims.some(
          (c) =>
            c.user_id === p.id &&
            c.status === 'approved' &&
            ownedSlugs.has(c.skill_slug),
        ),
    )
    const claimedSlugs = profile
      ? claims
          .filter(
            (c) =>
              c.user_id === profile.id &&
              c.status === 'approved' &&
              ownedSlugs.has(c.skill_slug),
          )
          .map((c) => c.skill_slug)
      : []
    const preferred = new Map(source.preferredSlugs.map((s, i) => [s, i]))
    owned.sort(
      (a, b) =>
        (preferred.get(a.slug) ?? 999) - (preferred.get(b.slug) ?? 999) ||
        a.name.localeCompare(b.name),
    )
    return {
      ...source,
      repositories,
      skills: owned,
      stars: repositoryStarTotal(repositories),
      statsAsOf:
        repositories.map((r) => r.observedAt).sort()[0] || source.checkedAt,
      updatedAt:
        repositories
          .map((r) => r.pushedAt)
          .sort()
          .at(-1) || source.checkedAt,
      claimedProfile: profile?.username || null,
      claimedSlugs,
    }
  })
}
export function selectCreators(
  entries: DirectoryCreator[],
  query = '',
  area = '',
  sort: CreatorSort = 'stars',
) {
  const q = query.normalize('NFKC').trim().toLowerCase().slice(0, 100)
  return entries
    .filter(
      (e) =>
        (!area || e.area === area) &&
        (!q ||
          [
            e.name,
            e.owner,
            e.area,
            ...e.repositories.map((r) => r.fullName),
            ...e.skills.map((s) => s.name),
          ]
            .join(' ')
            .normalize('NFKC')
            .toLowerCase()
            .includes(q)),
    )
    .sort((a, b) =>
      sort === 'editorial'
        ? entries.indexOf(a) - entries.indexOf(b)
        : sort === 'recent'
          ? b.updatedAt.localeCompare(a.updatedAt) ||
            a.owner.localeCompare(b.owner)
          : b.stars - a.stars || a.owner.localeCompare(b.owner),
    )
}
