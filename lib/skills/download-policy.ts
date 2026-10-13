import { createHash } from 'node:crypto'
import type { SkillRecord } from '@/lib/db/skills'
import { getSkillSourceEvidence } from './source-evidence'

export const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
export function verifiedDownloadBytes(bytes: Uint8Array, size: number, sha256: string) {
  return size > 0 && size <= MAX_DOWNLOAD_BYTES && bytes.byteLength === size &&
    /^[a-f0-9]{64}$/.test(sha256) && createHash('sha256').update(bytes).digest('hex') === sha256
}
export function downloadableDocument(skill: SkillRecord) {
  const source = getSkillSourceEvidence(skill)
  if (!source.canOfferInstall || source.status !== 'source-recorded' || !skill.long_description ||
    !skill.source_content_hash || !skill.source_commit_sha) return null
  const bytes = Buffer.from(skill.long_description, 'utf8')
  return verifiedDownloadBytes(bytes, bytes.length, skill.source_content_hash) ? bytes : null
}
