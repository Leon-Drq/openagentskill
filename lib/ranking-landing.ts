import type { SkillRecord } from '@/lib/db/skills'
import type { RankedSkill, RankingDefinition } from '@/lib/rankings'
import { normalizeRankingText } from '@/lib/rankings'
import { isDirectorySnapshot } from '@/lib/skills/directory'

export function rankingCandidates(skills: SkillRecord[], ranking: RankingDefinition, now = Date.now()) {
  if (ranking.kind !== 'new-this-week') return skills
  // A recently calculated fallback is not a newly indexed Skill.
  return skills.filter(skill => {
    const created = Date.parse(skill.created_at)
    return !isDirectorySnapshot(skill) && Number.isFinite(created) && created <= now && created >= now - 7 * 86_400_000
  })
}

export function rankingLandingJsonLd(ranking: RankingDefinition, items: RankedSkill[], title: string, description: string) {
  const url = `https://www.openagentskill.com/rankings/${ranking.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': url, url, name: title, description, mainEntity: { '@id': `${url}#list` } },
      { '@type': 'ItemList', '@id': `${url}#list`, numberOfItems: items.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: normalizeRankingText(item.skill.name), url: `https://www.openagentskill.com/skills/${item.skill.slug}` })) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OpenAgentSkill', item: 'https://www.openagentskill.com' },
        { '@type': 'ListItem', position: 2, name: 'Rankings', item: 'https://www.openagentskill.com/rankings' },
        { '@type': 'ListItem', position: 3, name: title, item: url },
      ] },
    ],
  }
}

export function validRankingDate(value: string | null | undefined) {
  return !!value && Number.isFinite(Date.parse(value))
}
