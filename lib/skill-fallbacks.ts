import { getSkillBySlugStrict, type SkillRecord } from '@/lib/db/skills'
import { withTimeout } from '@/lib/async'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { getCanonicalSkillSlug } from '@/lib/skill-slug-aliases'
// Proxy redirects, manifests, detail lookup and sitemap capture share one URL
// identity. A renamed repository must not be missing only on one surface.
export { getCanonicalSkillSlug, isCanonicalSkillSlug } from '@/lib/skill-slug-aliases'

export function normalizeSkillSlug(slug: string) {
  return getCanonicalSkillSlug(slug)
}

export function getCuratedSkillFallback(slug: string): SkillRecord | null {
  const normalized = normalizeSkillSlug(slug)
  return CURATED_SKILL_SNAPSHOT.find((skill) => skill.slug === normalized) || null
}

export function getSkillSuggestionsForSlug(slug: string, limit = 4): SkillRecord[] {
  const normalized = normalizeSkillSlug(slug)
  const terms = normalized.split(/[-_/]+/).filter((term) => term.length > 2)

  return CURATED_SKILL_SNAPSHOT
    .map((skill) => {
      const text = [
        skill.slug,
        skill.name,
        skill.description,
        skill.category,
        skill.github_repo,
        ...(skill.tags || []),
      ].join(' ').toLowerCase()
      const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0)
      return { skill, score }
    })
    .filter((item) => item.score > 0 || item.skill.slug === normalized)
    .sort((a, b) => b.score - a.score || Number(b.skill.github_stars || 0) - Number(a.skill.github_stars || 0))
    .slice(0, limit)
    .map((item) => item.skill)
}

export function isCuratedSkillFallback(skill: SkillRecord) {
  return skill.submission_source === 'curated_snapshot' || skill.id.startsWith('snapshot-')
}

export async function getSkillBySlugOrFallbackStrict(slug: string, cacheSeconds = 300): Promise<SkillRecord | null> {
  const normalized = normalizeSkillSlug(slug)
  const fallback = getCuratedSkillFallback(normalized)

  if (fallback) {
    const dbSkill = await withTimeout(
      getSkillBySlugStrict(normalized, cacheSeconds),
      1800,
      `curated skill lookup ${normalized}`
    ).catch(() => null)
    return dbSkill || fallback
  }

  return getSkillBySlugStrict(normalized, cacheSeconds)
}

export async function getSkillBySlugOrFallback(slug: string): Promise<SkillRecord | null> {
  return getSkillBySlugOrFallbackStrict(slug).catch(() => getCuratedSkillFallback(slug))
}
