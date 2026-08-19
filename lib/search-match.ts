import type { SkillRecord } from '@/lib/db/skills'

export type SearchMatchType = 'exact' | 'near' | 'related'

function normalized(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sourceSegments(skill: SkillRecord) {
  const values = [skill.slug, skill.name, skill.github_repo, skill.repository, skill.install_command]
  return values
    .flatMap((value) => (value || '').split(/[\s/]+/))
    .map(normalized)
    .filter(Boolean)
}

export function isDirectSkillLookup(query: string) {
  const value = query.trim()
  return value.length > 0 && value.length <= 120 && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(value)
}

export function classifySearchMatch(skill: SkillRecord, query: string): SearchMatchType {
  const lookup = normalized(query)
  if (!lookup) return 'related'

  const exactValues = new Set([
    normalized(skill.slug),
    normalized(skill.name),
    ...sourceSegments(skill),
  ])
  if (exactValues.has(lookup)) return 'exact'

  const tokens = lookup.split('-').filter((token) => token.length >= 2)
  const searchable = normalized([
    skill.slug,
    skill.name,
    skill.github_repo,
    skill.repository,
    skill.install_command,
  ].filter(Boolean).join(' '))
  if (
    searchable.includes(lookup) ||
    (tokens.length > 1 && tokens.every((token) => searchable.includes(token)))
  ) {
    return 'near'
  }

  return 'related'
}
