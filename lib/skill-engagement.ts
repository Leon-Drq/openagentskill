export interface SkillEngagementStats {
  likes: number
  dislikes: number
  vote: 1 | -1 | null
  saved: boolean
}

export type SkillEngagementMap = Record<string, SkillEngagementStats>

export function normalizeEngagementSlugs(values: string[]) {
  if (!values.length || values.length > 64 || values.some(value => !value || value.length > 200 || value.includes(','))) return null
  return [...new Set(values)].sort()
}
