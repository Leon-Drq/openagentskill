import type { SkillClaimRecord, SkillRecord } from '@/lib/db/skills'

export type SkillAttributionStatus =
  | 'verified_maintainer'
  | 'community_indexed'
  | 'community_submitted'
  | 'agent_submitted'
  | 'registry_indexed'

export interface SkillAttribution {
  status: SkillAttributionStatus
  statusLabel: string
  shortLabel: string
  sourceLabel: string
  sourceDetail: string
  creatorName: string
  creatorUrl: string | null
  sourceUrl: string | null
  indexedBy: string
  claimUrl: string
  claimCta: string
  trustNote: string
  publicNote: string
}

function normalizeUrl(value: string | null | undefined) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return null
}

function getRepositoryUrl(skill: SkillRecord) {
  if (normalizeUrl(skill.repository)) return skill.repository
  if (skill.github_repo) return `https://github.com/${skill.github_repo}`
  return null
}

function getSourceLabel(source: string | null | undefined) {
  switch (source) {
    case 'github-star-discovery':
      return 'GitHub star discovery'
    case 'auto-indexer':
      return 'OpenAgentSkill auto-indexer'
    case 'agent':
      return 'Agent submitted'
    case 'api':
      return 'API submitted'
    case 'web':
      return 'Community submitted'
    default:
      return source ? source.replace(/[-_]/g, ' ') : 'Registry indexed'
  }
}

function getAttributionStatus(skill: SkillRecord, approvedClaim?: SkillClaimRecord | null): SkillAttributionStatus {
  if (approvedClaim) return 'verified_maintainer'
  if (skill.submission_source === 'web') return 'community_submitted'
  if (skill.submission_source === 'agent') return 'agent_submitted'
  if (skill.submission_source === 'github-star-discovery' || skill.submission_source === 'auto-indexer') {
    return 'community_indexed'
  }
  return 'registry_indexed'
}

function getStatusLabel(status: SkillAttributionStatus) {
  switch (status) {
    case 'verified_maintainer':
      return 'Verified maintainer'
    case 'community_submitted':
      return 'Community submitted'
    case 'agent_submitted':
      return 'Agent submitted'
    case 'community_indexed':
      return 'Community indexed'
    default:
      return 'Registry indexed'
  }
}

function getTrustNote(status: SkillAttributionStatus, approvedClaim?: SkillClaimRecord | null) {
  if (status === 'verified_maintainer') {
    return `Maintainer claim approved for @${approvedClaim?.github_username || 'the listed creator'}.`
  }

  return 'This listing was indexed from public sources and is not marked official until a maintainer claim is approved.'
}

export function getSkillAttribution(
  skill: SkillRecord,
  approvedClaim?: SkillClaimRecord | null
): SkillAttribution {
  const status = getAttributionStatus(skill, approvedClaim)
  const sourceLabel = getSourceLabel(skill.submission_source)
  const creatorUrl = normalizeUrl(skill.author_url) || getRepositoryUrl(skill)
  const sourceUrl = getRepositoryUrl(skill) || creatorUrl
  const statusLabel = getStatusLabel(status)

  return {
    status,
    statusLabel,
    shortLabel: statusLabel.toUpperCase(),
    sourceLabel,
    sourceDetail: skill.github_repo || skill.repository || sourceLabel,
    creatorName: skill.author_name || 'Unknown creator',
    creatorUrl,
    sourceUrl,
    indexedBy: status === 'verified_maintainer' ? 'OpenAgentSkill + verified maintainer' : 'OpenAgentSkill community index',
    claimUrl: `https://www.openagentskill.com/skills/${skill.slug}#claim-this-skill`,
    claimCta: status === 'verified_maintainer' ? 'View verification' : 'Claim this skill',
    trustNote: getTrustNote(status, approvedClaim),
    publicNote:
      status === 'verified_maintainer'
        ? 'Creator attribution has been verified through the claim workflow.'
        : 'Attribution links to the public repository or creator profile. Creators can claim the listing to update ownership signals.',
  }
}
