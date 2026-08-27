import type { SkillRecord } from '@/lib/db/skills'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'

const STANDARD_SKILL_INSTALL = /^npx(?:\s+-y)?\s+skills(?:@latest)?\s+add\s+[^\s]+\s+--skill\s+[^\s]+$/i

export function isTrustedResolveFallback(skill: SkillRecord) {
  const repository = String(skill.repository || '')
  const installCommand = String(skill.install_command || '').trim()

  return (
    skill.submission_source === 'curated_snapshot' &&
    skill.verified === true &&
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/tree\//i.test(repository) &&
    STANDARD_SKILL_INSTALL.test(installCommand)
  )
}

// Resolver fallbacks are an availability safeguard, not extra inventory.
// Only source-verified records that identify one concrete skill path may be
// returned when the live registry is unavailable.
export const TRUSTED_RESOLVE_FALLBACKS = CURATED_SKILL_SNAPSHOT.filter(isTrustedResolveFallback)
