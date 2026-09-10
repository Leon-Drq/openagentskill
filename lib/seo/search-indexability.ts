import type { SkillRecord } from '@/lib/db/skills'
import editorialEntries from './editorial-index.json' with { type: 'json' }

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
// Legacy approved pages retain their existing eligibility. An additional,
// source-pinned editorial lane controls search visibility, NEVER installation.
export const SEARCH_INDEX_PUBLICATION_FILTER = 'ai_review_approved.eq.true'

type SearchIndexCandidate = Pick<
  SkillRecord,
  'ai_review_approved' | 'quality_score' | 'github_stars' | 'publisher_verified'
> & Partial<Pick<SkillRecord, 'slug' | 'github_repo' | 'source_path' | 'source_commit_sha' | 'source_content_hash' | 'source_sync_status' | 'license' | 'listing_status'>>

export function getEditorialSearchProfile(skill: Partial<SearchIndexCandidate>) {
  if (!['owner_published', 'static_checked', 'reviewed'].includes(skill.listing_status || '') || skill.source_sync_status !== 'current') return undefined
  return editorialEntries.find(entry => entry.slug === skill.slug &&
    entry.repository === skill.github_repo && entry.path === skill.source_path &&
    entry.commit === skill.source_commit_sha && entry.hash === skill.source_content_hash && entry.license === skill.license)
}

/** One predicate for sitemap COUNT and rows; no caller-controlled SQL values. */
export function buildSearchIndexFilter(minStars = SEARCH_INDEX_MIN_GITHUB_STARS, minQuality = SEARCH_INDEX_MIN_QUALITY_SCORE) {
  const stars = Math.max(0, Math.floor(Number.isFinite(minStars) ? minStars : SEARCH_INDEX_MIN_GITHUB_STARS))
  const quality = Math.max(0, Math.floor(Number.isFinite(minQuality) ? minQuality : SEARCH_INDEX_MIN_QUALITY_SCORE))
  const aliases = editorialEntries.flatMap(entry => entry.aliases)
  const legacy = [SEARCH_INDEX_PUBLICATION_FILTER, ...(quality ? [`quality_score.gte.${quality}`] : []), ...(stars ? [`or(github_stars.gte.${stars},publisher_verified.eq.true)`] : []), ...(aliases.length ? [`slug.not.in.(${aliases.join(',')})`] : [])]
  const editorial = editorialEntries.map(entry => `and(slug.eq.${entry.slug},github_repo.eq.${entry.repository},source_path.eq.${entry.path},source_commit_sha.eq.${entry.commit},source_content_hash.eq.${entry.hash},license.eq.${entry.license},source_sync_status.eq.current,listing_status.in.(owner_published,static_checked,reviewed))`)
  return [`and(${legacy.join(',')})`, ...editorial].join(',')
}

export interface SearchEvidenceProfile {
  tier: 'verified-owner' | 'outcome-backed' | 'repository-backed' | 'thin'
  label: string
  score: number
  indexEligible: boolean
  signals: string[]
}

export function isSearchIndexEligible(skill: SearchIndexCandidate) {
  if (editorialEntries.some(entry => entry.aliases.includes(skill.slug || ''))) return false
  if (getEditorialSearchProfile(skill)) return true
  return (
    skill.ai_review_approved === true &&
    Number(skill.quality_score || 0) >= SEARCH_INDEX_MIN_QUALITY_SCORE &&
    (
      Number(skill.github_stars || 0) >= SEARCH_INDEX_MIN_GITHUB_STARS ||
      skill.publisher_verified === true
    )
  )
}

export function getSearchEvidenceProfile(
  skill: SearchIndexCandidate,
  evidence: { verifiedInstalls?: number; totalOutcomes?: number } = {}
): SearchEvidenceProfile {
  const verifiedInstalls = Math.max(0, Number(evidence.verifiedInstalls || 0))
  const totalOutcomes = Math.max(0, Number(evidence.totalOutcomes || 0))
  const signals: string[] = []
  let score = 0

  if (skill.ai_review_approved) {
    score += 25
    signals.push('Registry review approval recorded')
  }
  if (getEditorialSearchProfile(skill)) signals.push('Source-pinned editorial search listing; not installation approval')
  score += Math.min(25, Number(skill.quality_score || 0) / 4)
  if (Number(skill.quality_score || 0) >= SEARCH_INDEX_MIN_QUALITY_SCORE) signals.push('Quality-gated metadata')
  if (Number(skill.github_stars || 0) >= SEARCH_INDEX_MIN_GITHUB_STARS) {
    score += Math.min(15, Math.log10(Number(skill.github_stars || 0) + 1) * 5)
    signals.push('Public repository adoption')
  }
  if (skill.publisher_verified) {
    score += 20
    signals.push('GitHub-verified publisher')
  }
  if (verifiedInstalls > 0) {
    score += Math.min(8, Math.log10(verifiedInstalls + 1) * 5)
    signals.push('Verified installs')
  }
  if (totalOutcomes > 0) {
    score += Math.min(12, Math.log10(totalOutcomes + 1) * 7)
    signals.push('Reported agent outcomes')
  }

  const tier = skill.publisher_verified
    ? 'verified-owner'
    : totalOutcomes > 0 || verifiedInstalls > 0
      ? 'outcome-backed'
      : isSearchIndexEligible(skill)
        ? 'repository-backed'
        : 'thin'

  return {
    tier,
    label: tier === 'verified-owner'
      ? 'Verified publisher evidence'
      : tier === 'outcome-backed'
        ? 'Real agent outcome evidence'
        : tier === 'repository-backed'
          ? 'Repository-backed evidence'
          : 'Insufficient public evidence',
    score: Math.min(100, Math.round(score)),
    indexEligible: isSearchIndexEligible(skill),
    signals,
  }
}
