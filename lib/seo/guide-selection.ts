import type { SkillRecord } from '@/lib/db/skills'
import type { GrowthGuideDefinition } from '@/lib/seo/growth-guides'

const GENERIC_KEYWORDS = new Set(['agent', 'agents', 'skill', 'skills', 'ai', 'github', 'repository', 'code', 'claude', 'codex', 'anthropic', 'openai'])
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function identityMatches(skill: SkillRecord, value: string) {
  const needle = normalize(value)
  return [skill.slug, skill.name, skill.github_repo, skill.repository]
    .filter(Boolean)
    .some(part => normalize(String(part)) === needle || normalize(String(part).split('/').pop() || '') === needle)
}

export function scoreSkillForGuide(skill: SkillRecord, guide: GrowthGuideDefinition) {
  if ((guide.primarySkillSlugs || []).some(value => identityMatches(skill, value))) return 1000
  if ((guide.compareTargetNames || []).some(value => identityMatches(skill, value))) return 900
  if (guide.curatedOnly) return 0

  // Names, stars and installability alone cannot establish task relevance.
  // Word boundaries prevent e.g. "rag" matching "storage".
  const text = ` ${normalize([skill.name, skill.slug, skill.description,
    skill.tagline, ...(skill.tags || [])].filter(Boolean).join(' '))} `
  return guide.skillKeywords.reduce((score, keyword) => {
    const term = normalize(keyword)
    return term && !GENERIC_KEYWORDS.has(term) && text.includes(` ${term} `)
      ? score + (term.includes(' ') ? 6 : 4)
      : score
  }, 0)
}

export function selectGuideSkills(skills: SkillRecord[], guide: GrowthGuideDefinition, limit = 12) {
  const seen = new Set<string>()
  return skills
    .filter(skill => skill.ai_review_approved === true)
    .map(skill => ({ skill, score: scoreSkillForGuide(skill, guide) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.skill.github_stars || 0) - Number(a.skill.github_stars || 0) || a.skill.slug.localeCompare(b.skill.slug))
    .filter(({ skill }) => {
      if (seen.has(skill.slug)) return false
      seen.add(skill.slug)
      return true
    })
    .slice(0, Math.max(0, limit))
    .map(({ skill }) => skill)
}

// A comparison headline must not be populated by unrelated fallback candidates.
export function selectComparisonSkills(skills: SkillRecord[], guide: GrowthGuideDefinition) {
  return (guide.compareTargetNames || []).map(name => skills.find(skill =>
    skill.ai_review_approved === true && identityMatches(skill, name)
  )).filter((skill): skill is SkillRecord => Boolean(skill))
    .filter((skill, index, items) => items.findIndex(item => item.slug === skill.slug) === index)
}
