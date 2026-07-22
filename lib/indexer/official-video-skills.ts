import { syncVerifiedSkillSources } from '@/lib/indexer/verified-skill-sources'

export const OFFICIAL_VIDEO_SKILL_SLUGS = [
  'vox-director',
  'seedance-prompt-en',
] as const

/**
 * Syncs the verified video-creation skills that expose a first-class SKILL.md.
 */
export function syncOfficialVideoSkills() {
  return syncVerifiedSkillSources({
    label: 'official video',
    slugs: OFFICIAL_VIDEO_SKILL_SLUGS,
  })
}
