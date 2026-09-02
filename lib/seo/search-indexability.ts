import type { SkillRecord } from '@/lib/db/skills'

// Search should showcase skills with enough public evidence to stand on their
// own. The full catalog stays available to people and agents, while this
// threshold controls only public search surfaces such as sitemaps and detail
// page robots metadata.
// Production sampling showed that approved 50–54 records already carry
// substantial repository evidence (typically 80+ GitHub stars, a concrete
// description, and an installable source). Verified repository ownership is a
// separate, stronger provenance signal: it may replace the popularity floor,
// but it never bypasses AI review or the quality floor.
export const SEARCH_INDEX_MIN_QUALITY_SCORE = 50
export const SEARCH_INDEX_MIN_GITHUB_STARS = 3

type SearchIndexCandidate = Pick<
  SkillRecord,
  'ai_review_approved' | 'quality_score' | 'github_stars' | 'publisher_verified'
>

export function isSearchIndexEligible(skill: SearchIndexCandidate) {
  return (
    skill.ai_review_approved === true &&
    Number(skill.quality_score || 0) >= SEARCH_INDEX_MIN_QUALITY_SCORE &&
    (
      Number(skill.github_stars || 0) >= SEARCH_INDEX_MIN_GITHUB_STARS ||
      skill.publisher_verified === true
    )
  )
}
