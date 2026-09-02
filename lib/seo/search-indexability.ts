import type { SkillRecord } from '@/lib/db/skills'

// Search should showcase skills with enough public evidence to stand on their
// own. The full catalog stays available to people and agents, while this
// threshold controls only public search surfaces such as sitemaps and detail
// page robots metadata.
// Production sampling showed that approved 50–54 records already carry
// substantial repository evidence (typically 80+ GitHub stars, a concrete
// description, and an installable source). Keeping the AI-review and adoption
// gates while using 50 as the quality floor expands useful long-tail coverage
// without turning the sitemap into a raw inventory dump.
export const SEARCH_INDEX_MIN_QUALITY_SCORE = 50
export const SEARCH_INDEX_MIN_GITHUB_STARS = 3

type SearchIndexCandidate = Pick<
  SkillRecord,
  'ai_review_approved' | 'quality_score' | 'github_stars'
>

export function isSearchIndexEligible(skill: SearchIndexCandidate) {
  return (
    skill.ai_review_approved === true &&
    Number(skill.quality_score || 0) >= SEARCH_INDEX_MIN_QUALITY_SCORE &&
    Number(skill.github_stars || 0) >= SEARCH_INDEX_MIN_GITHUB_STARS
  )
}
