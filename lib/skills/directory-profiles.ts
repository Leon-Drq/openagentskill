import type { SkillAgentStats, SkillRecord } from '@/lib/db/skills'
import { createBoundedContentMemo } from '@/lib/bounded-content-memo'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { getSkillSupplyProfile } from '@/lib/supply'

function computeProfiles(record: SkillRecord, agentStats: SkillAgentStats | null) {
  // Audit/supply use repository-only quality, not outcome-adjusted quality.
  // Keep those semantics separate while sharing identical work.
  const quality = getSkillQualityProfile(record)
  const trust = getSkillTrustProfile(record)
  const audit = buildSkillAudit(record, null, { quality, trust })
  return {
    qualityProfile: agentStats ? getSkillQualityProfile(record, agentStats) : quality,
    trustProfile: trust,
    safetyProfile: getAgentSafetyProfile(record, audit, { max_risk: 'medium', needs_install_command: true }),
    platformHints: getPlatformHints(record),
    supplyProfile: getSkillSupplyProfile(record, null, { quality, trust, audit }),
  }
}

const memo = createBoundedContentMemo<ReturnType<typeof computeProfiles>>({
  version: 'directory-profiles-v1', maxEntries: 512, maxBytes: 8 * 1024 * 1024, ttlMs: 60_000,
})

export function getDirectoryProfiles(record: SkillRecord, agentStats: SkillAgentStats | null) {
  // Every source/security/claim/stat field participates in the key. A changed
  // record cannot inherit stale safety results from another version.
  return memo([record, agentStats], () => computeProfiles(record, agentStats))
}

/** Filtering/ranking needs raw records; only evaluated filters and visible
 * cards need full audit/safety/supply profiles. Never fabricate placeholder scores.
 */
export function withLazyDirectoryProfiles<T extends object>(item: T, record: SkillRecord, agentStats: SkillAgentStats | null) {
  let profiles: ReturnType<typeof getDirectoryProfiles> | undefined
  const read = () => profiles ??= getDirectoryProfiles(record, agentStats)
  const fields = {
    get qualityProfile() { return read().qualityProfile },
    get trustProfile() { return read().trustProfile },
    get safetyProfile() { return read().safetyProfile },
    get platformHints() { return read().platformHints },
    get supplyProfile() { return read().supplyProfile },
  }
  return Object.defineProperties(item, Object.getOwnPropertyDescriptors(fields)) as T & typeof fields
}
