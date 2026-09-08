import type { SkillRecord } from '@/lib/db/skills'

type SourceRecord = Partial<Pick<SkillRecord, 'source_path' | 'source_commit_sha' | 'source_content_hash' | 'source_sync_status' | 'ai_review_score' | 'install_command' | 'repository' | 'github_repo'>>

export const SOURCE_REVIEW_NOTICE = 'Skill source structure is not confirmed in the registry. Inspect the source and identify valid skill instructions before proposing an installation. A repository URL or GitHub stars do not prove installability.'

/** Stored discovery evidence, NOT a fresh source scan, security approval or runtime test. */
export function getSkillSourceEvidence(skill: SourceRecord) {
  const review = skill.ai_review_score && typeof skill.ai_review_score === 'object' ? skill.ai_review_score : {}
  const rawPath = skill.source_path || review.skill_path
  const path = typeof rawPath === 'string' ? rawPath.replace(/\\/g, '/').trim() : ''
  const validPath = path.length <= 1024 && !/[\u0000-\u001f\u007f]/.test(path) && /(^|\/)SKILL\.md$/i.test(path) && !path.split('/').some(part => part === '..' || part === '.') && !path.startsWith('/') && !path.includes(':')
  const sourceRecorded = Boolean(validPath)
  const sourceChanged = skill.source_sync_status === 'changed' || skill.source_sync_status === 'error'
  const canOfferInstall = sourceRecorded && !sourceChanged && Boolean(skill.install_command)
  return {
    status: sourceChanged ? 'source-needs-review' as const : sourceRecorded ? 'source-recorded' as const : 'unverified' as const,
    sourceRecorded,
    canOfferInstall,
    path: sourceRecorded ? path : null,
    revision: skill.source_commit_sha || null,
    notice: sourceChanged
      ? 'The tracked source changed or could not be synchronized. Review the current source before installing.'
      : !sourceRecorded ? SOURCE_REVIEW_NOTICE
      : !canOfferInstall ? 'A skill instruction path is recorded, but no install command is available. Review the source instructions.'
      : 'A skill instruction path and install command are recorded. This is not proof of compatibility, runtime success or safety; review the source and permissions first.',
  }
}
