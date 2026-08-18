const SEARCH_STOP_WORDS = new Set([
  'about', 'agent', 'agents', 'and', 'as', 'for', 'from', 'into', 'need', 'right', 'skill', 'skills',
  'that', 'the', 'this', 'use', 'using', 'want', 'what', 'when', 'with',
])

export function getSearchTerms(normalizedQuery: string) {
  const terms = Array.from(
    new Set(
      normalizedQuery
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))
    )
  ).slice(0, 10)

  return terms.length > 0 ? terms : [normalizedQuery]
}

export function normalizeExactSearchQuery(query: string) {
  return query
    .trim()
    .replace(/[%_,{},()]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
}
