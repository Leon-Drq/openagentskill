import { getSkillBySlug, type SkillRecord } from '@/lib/db/skills'
import { withTimeout } from '@/lib/async'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'

const SLUG_ALIASES: Record<string, string> = {
  crawl4ai: 'crawl4ai',
  'crawl-4-ai': 'crawl4ai',
  serenity: 'serenity-skill',
  'serenity-stock-analysis': 'serenity-skill',
  'muxuuu-serenity-skill': 'serenity-skill',
  last30days: 'last30days-skill',
  'last-30-days': 'last30days-skill',
  'mvanhorn-last30days-skill': 'last30days-skill',
  'agent-skills': 'addyosmani-agent-skills',
  'addy-agent-skills': 'addyosmani-agent-skills',
  'addyosmani-agent-skills': 'addyosmani-agent-skills',
  'addyosmani/agent-skills': 'addyosmani-agent-skills',
  'davidondrej-skills': 'davidondrej-skills',
  'david-ondrej-skills': 'davidondrej-skills',
  'davidondrej/skills': 'davidondrej-skills',
  'david-ondrej/skills': 'davidondrej-skills',
  openbb: 'openbb',
  'openbb-finance': 'openbb',
  'aaron-marketing': 'aaron-he-zhu-aaron-marketing-skills',
  'aaron-marketing-skills': 'aaron-he-zhu-aaron-marketing-skills',
  'aaron-he-zhu/aaron-marketing-skills': 'aaron-he-zhu-aaron-marketing-skills',
  markitdown: 'markitdown',
  'mark-it-down': 'markitdown',
  'statsbomb': 'statsbomb-open-data',
  'football-analytics': 'statsbomb-open-data',
}

export function normalizeSkillSlug(slug: string) {
  const normalized = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
  return SLUG_ALIASES[normalized] || normalized
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

export async function getSkillBySlugOrFallback(slug: string): Promise<SkillRecord | null> {
  const normalized = normalizeSkillSlug(slug)
  const fallback = getCuratedSkillFallback(normalized)

  if (fallback) {
    const dbSkill = await withTimeout(
      getSkillBySlug(normalized),
      650,
      `curated skill lookup ${normalized}`
    ).catch(() => null)
    return dbSkill || fallback
  }

  return getSkillBySlug(normalized).catch(() => null)
}
