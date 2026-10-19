import type { SkillRecord } from '@/lib/db/skills'
// @ts-expect-error Standalone Node regression tests load TypeScript directly.
import { repositorySearchQuery } from './search-query.ts'

export type SearchMatchType = 'exact' | 'near' | 'related'

function normalized(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function sourceSegments(skill: SkillRecord) {
  const repositoryName = normalized(skill.github_repo?.split('/').at(-1))
  return repositoryName && !/^(skills?|agents?|tools?)$/.test(repositoryName) ? [repositoryName] : []
}

// At most one typo, including an adjacent transposition. Never fuzz repository
// owners or match description text as a product identity.
function oneEditApart(a: string, b: string) {
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) ||
    (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

/** Small, indexed name-only candidate probes; validate all results below. */
export function nameLookupPatterns(query: string) {
  if (repositorySearchQuery(query) || query.length > 120) return []
  const tokens = normalized(query).split('-').filter(Boolean)
  if (!tokens.length || tokens.length > 5 || tokens.some(t => t.length < 3)) return []
  const patterns = [tokens.join('%') + '%']
  // For compound names retain all but one token. This recovers one mistyped
  // segment without scanning descriptions or fetching the entire registry.
  if (tokens.length > 1) {
    for (let i = 0; i < Math.min(tokens.length, 3); i++) {
      const kept = tokens.filter((_, index) => index !== i)
      if (kept.join('').length >= 5) patterns.push('%' + kept.join('%') + '%')
    }
  } else if (tokens[0].length >= 6) {
    const half = Math.ceil(tokens[0].length / 2)
    patterns.push(tokens[0].slice(0, half) + '%', '%' + tokens[0].slice(half))
  }
  return [...new Set(patterns)].slice(0, 4)
}

export function searchMatchPriority(match: SearchMatchType) {
  return match === 'exact' ? 2 : match === 'near' ? 1 : 0
}

export function isDirectSkillLookup(query: string) {
  const value = query.trim()
  // These are task/category searches, not missing product identities.
  if (/^(?:video|logo|design|presentation|slides|research|finance|coding|development|marketing|scraping|translation|testing|skills?|agents?)$/i.test(value)) return false
  return Boolean(repositorySearchQuery(value)) || (value.length > 0 && value.length <= 120 && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(value))
}

export function classifySearchMatch(skill: SkillRecord, query: string): SearchMatchType {
  const lookup = normalized(query)
  if (!lookup) return 'related'
  const repository = repositorySearchQuery(query)
  if (repository) return skill.github_repo?.toLowerCase() === repository ? 'exact' : 'related'

  const exactValues = new Set([
    normalized(skill.slug),
    normalized(skill.name),
    ...sourceSegments(skill),
  ])
  if (exactValues.has(lookup) || [...exactValues].some(value => value.replace(/-/g, '') === lookup.replace(/-/g, ''))) return 'exact'

  if ([...exactValues].some(value => oneEditApart(value, lookup))) return 'near'

  const tokens = lookup.split('-').filter((token) => token.length >= 2)
  const searchable = normalized([
    skill.slug,
    skill.name,
    skill.github_repo,
  ].filter(Boolean).join(' '))
  if (
    searchable.includes(lookup) ||
    (tokens.length > 1 && tokens.every((token) => searchable.includes(token)))
  ) {
    return 'near'
  }

  return 'related'
}
