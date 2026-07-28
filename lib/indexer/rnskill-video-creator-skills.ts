import { syncVerifiedSkillSources } from '@/lib/indexer/verified-skill-sources'

export const RNSKILL_VIDEO_CREATOR_SKILL_SLUGS = [
  'pluviobyte-ra-topic',
  'pluviobyte-ra-practical-video-planning',
  'pluviobyte-ra-video-title',
  'pluviobyte-tts-skill',
  'pluviobyte-heygen-digital-avatar',
  'pluviobyte-ra-local-talking-head-cut',
  'pluviobyte-ra-audio-to-subtitles',
  'pluviobyte-skill-captions',
  'pluviobyte-rn-cover-skill',
  'pluviobyte-ra-retrospective',
] as const

/**
 * Sync a deliberately narrow, source-checked subset of the RNSkill video
 * repository. Each entry must still expose an explicit SKILL.md and matching
 * frontmatter before it reaches the registry. Listings remain unverified so
 * the public trust layer can require human review for workspace, rights, and
 * paid-service assumptions.
 */
export function syncRnskillVideoCreatorSkills() {
  return syncVerifiedSkillSources({
    label: 'RNSkill video creator',
    slugs: RNSKILL_VIDEO_CREATOR_SKILL_SLUGS,
    listingVerified: false,
    listingSource: 'curated-skill-path',
  })
}
