import type { SkillAgentStats, SkillRecord } from '@/lib/db/skills'
import { createContentMemo } from '@/lib/cache/content-memo'
import { buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { getSkillSupplyProfile } from '@/lib/supply'

// Shared across locales and query variants in the same function instance.
// Including the complete record and stats invalidates immediately on changes
// to source evidence, review state, license, claims or usage statistics.
export const getDirectoryProfile = createContentMemo(
  ({ record, agentStats }: { record: SkillRecord; agentStats: SkillAgentStats | null }) => ({
    qualityProfile: getSkillQualityProfile(record, agentStats),
    trustProfile: getSkillTrustProfile(record),
    safetyProfile: getAgentSafetyProfile(record, buildSkillAudit(record), {
      max_risk: 'medium',
      needs_install_command: true,
    }),
    platformHints: getPlatformHints(record),
    supplyProfile: getSkillSupplyProfile(record),
  }),
)
