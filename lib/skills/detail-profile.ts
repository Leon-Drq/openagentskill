import type { SkillRecord } from '@/lib/db/skills'
import { getSkillSourceEvidence } from '@/lib/skills/source-evidence'

const generic = new Set(['skill', 'skills', 'agent', 'agents', 'code', 'coding', 'with', 'from', 'that', 'this', 'your', 'github', 'repository', 'tool', 'tools', 'workflow', 'workflows', 'claude', 'codex', 'cursor', 'open', 'source', 'using', 'support', 'supports', 'create'])
function words(skill: SkillRecord) {
  return new Set([skill.name, skill.description, skill.tagline].filter(Boolean).join(' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(term => term.length > 3 && !generic.has(term)))
}

/** Rank the existing bounded candidate set by descriptive overlap, never fill with unrelated stars. */
export function selectDetailAlternatives(skill: SkillRecord, candidates: SkillRecord[], limit = 4) {
  const terms = words(skill)
  const seen = new Set([skill.slug])
  return candidates.map(candidate => ({candidate, overlap: [...words(candidate)].filter(term => terms.has(term)).length}))
    .filter(({candidate, overlap}) => overlap >= 2 && (candidate.ai_review_approved || candidate.listing_status === 'owner_published'))
    .sort((a, b) => b.overlap - a.overlap || b.candidate.github_stars - a.candidate.github_stars)
    .filter(({candidate}) => { if (seen.has(candidate.slug)) return false; seen.add(candidate.slug); return true })
    .slice(0, limit).map(({candidate}) => candidate)
}

export function buildDetailStructuredData(skill: SkillRecord) {
  const evidence = getSkillSourceEvidence(skill)
  const url = `https://www.openagentskill.com/skills/${skill.slug}`
  const validDate = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? value : undefined
  const publicUrl = (value: string | null | undefined) => value && /^https:\/\//i.test(value) ? value : undefined
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': evidence.sourceRecorded ? 'SoftwareSourceCode' : 'CreativeWork',
        '@id': `${url}#skill`, url, name: skill.name, description: skill.description,
        ...(evidence.sourceRecorded ? {codeRepository: publicUrl(skill.repository)} : {}),
        // Do not turn registry defaults into free offers, OS compatibility or certified versions.
        datePublished: validDate(skill.created_at), dateModified: validDate(skill.updated_at),
        license: skill.license && !/^(unknown|missing|none|n\/a)$/i.test(skill.license) ? skill.license : undefined,
        creator: { '@type': 'Thing', name: skill.author_name, url: publicUrl(skill.author_url) },
        sameAs: [publicUrl(skill.repository)].filter(Boolean),
        isPartOf: { '@type': 'WebSite', '@id': 'https://www.openagentskill.com/#website' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Skills', item: 'https://www.openagentskill.com/skills' },
          { '@type': 'ListItem', position: 2, name: skill.category, item: `https://www.openagentskill.com/skills?category=${encodeURIComponent(skill.category)}` },
          { '@type': 'ListItem', position: 3, name: skill.name, item: url },
        ],
      },
    ],
  }
}

export function serializeDetailJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
