import 'server-only'
import snapshot from '@/data/public-directory-saved.json'
import type { SkillRecord, SkillSortMode } from '@/lib/db/skills'
import { sortDirectoryCandidates } from '@/lib/skills/directory'
import { publicSavedRow, usableSavedDirectory, type SavedDirectory } from './saved-directory-format'

// Server-only import: the complete snapshot must never be hydrated to a browser.
// These are discovery records only. Do not use them to authorize installations,
// payments, review approvals, user writes or a current total registry count.
const data = snapshot as SavedDirectory
const records = data.rows.map(publicSavedRow).filter(row => row !== null) as unknown as SkillRecord[]

export function getSavedDirectory(sort: SkillSortMode = 'quality', limit = 480, now = Date.now()) {
  if (!usableSavedDirectory(data, now)) return null
  const size = Number.isFinite(limit) ? Math.min(480, Math.max(1, Math.floor(limit))) : 480
  return {
    records: sortDirectoryCandidates(records.map(record => ({ record })), sort).slice(0, size).map(item => item.record),
    savedFrom: data.savedFrom, savedThrough: data.savedThrough, coverage: 'partial' as const,
  }
}
