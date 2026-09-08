import {
  SHOWCASE_CASES,
  SHOWCASE_SKILLS,
  SHOWCASE_CREATORS,
// @ts-expect-error Direct Node regression tests require the TypeScript extension.
} from './showcase.ts'
export function getCreatorWorks(owner: string) {
  const ids = new Set(
    SHOWCASE_CREATORS.filter(
      (c) => c.githubUsername?.toLowerCase() === owner.toLowerCase(),
    ).map((c) => c.id),
  )
  const slugs = new Set(
    SHOWCASE_SKILLS.filter((s) => ids.has(s.creatorId)).map((s) => s.slug),
  )
  return SHOWCASE_CASES.filter((c) => slugs.has(c.skillSlug))
}
