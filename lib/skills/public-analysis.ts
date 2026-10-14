import { unstable_cache } from 'next/cache'
import { buildSkillAudit } from '@/lib/audits'
import { buildSkillEvalProfile } from '@/lib/skill-evals'
import type { SkillRecord, SkillEventStats } from '@/lib/db/skills'

// Complete inputs participate in the key. Display snapshots never authorize
// installation, payment, review approval or private access.
export function getPublicAudit(skill: SkillRecord, eventStats: SkillEventStats | null) {
  return unstable_cache(async (record: SkillRecord, stats: SkillEventStats | null) => buildSkillAudit(record, stats), ['public-audit-v1'], {
    revalidate: 3600, tags: [`public-skill:${skill.slug}`, 'public-skill-events'],
  })(skill, eventStats)
}

export function getPublicEval(skill: SkillRecord, options: Parameters<typeof buildSkillEvalProfile>[1]) {
  return unstable_cache(async (record: SkillRecord, input: Parameters<typeof buildSkillEvalProfile>[1]) => buildSkillEvalProfile(record, input), ['public-eval-v1'], {
    revalidate: 3600, tags: [`public-skill:${skill.slug}`, 'public-skill-events'],
  })(skill, options)
}
