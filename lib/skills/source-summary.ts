import { parseSkillDocument } from '../github/skill-source'

export function isMalformedSourceSummary(value: string | null | undefined) {
  return /^[|>](?:[1-9][+-]?|[+-][1-9]?)?$/.test(value?.trim() || '')
}

/** Repair presentation from the stored source, never review/approval evidence. */
export function repairStoredSkillSummary<T extends { description?: string; tagline?: string | null; long_description?: string | null }>(record: T): T {
  if (!isMalformedSourceSummary(record.description) && !isMalformedSourceSummary(record.tagline)) return record
  const parsed = record.long_description ? parseSkillDocument(record.long_description) : null
  if (!parsed || isMalformedSourceSummary(parsed.description) || parsed.description.length < 20) return record
  return {
    ...record,
    ...(isMalformedSourceSummary(record.description) ? { description: parsed.description } : {}),
    ...(isMalformedSourceSummary(record.tagline) ? { tagline: parsed.description.replace(/\s+/g, ' ').slice(0, 160) } : {}),
  }
}
