import type { SkillRecord } from '@/lib/db/skills'

export type SkillSocialStatusTone = 'verified' | 'reviewed' | 'source' | 'community'

export interface SkillSocialProvenance {
  label: string
  detail: string
  tone: SkillSocialStatusTone
}

export function getSkillSocialProvenance(skill: SkillRecord): SkillSocialProvenance {
  if (skill.publisher_verified) {
    return {
      label: 'CREATOR VERIFIED',
      detail: 'Ownership confirmed',
      tone: 'verified',
    }
  }

  if (skill.verified) {
    return {
      label: 'REGISTRY VERIFIED',
      detail: 'Registry review passed',
      tone: 'reviewed',
    }
  }

  if (skill.source_sync_status === 'current' && skill.source_content_hash) {
    return {
      label: 'SOURCE CURRENT',
      detail: 'Repository snapshot recorded',
      tone: 'source',
    }
  }

  return {
    label: 'COMMUNITY INDEXED',
    detail: 'Public source · claimable',
    tone: 'community',
  }
}

export function getSkillGitHubOwner(skill: Pick<SkillRecord, 'github_repo' | 'author_name'>) {
  const [owner] = (skill.github_repo || '').split('/')
  return owner?.trim() || skill.author_name?.trim() || 'community'
}
