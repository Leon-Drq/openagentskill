/** Preserve healthy parallel results without disguising an incomplete search. */
export function collectSearchResults<T extends { slug: string }>(results: PromiseSettledResult<T[]>[], limit: number) {
  const failed = results.filter(result => result.status === 'rejected')
  const rows = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
  // Unknown is not a definitive zero-result response.
  if (!rows.length && failed.length) throw new Error('Skill search is temporarily incomplete')
  const seen = new Set<string>()
  return {
    records: rows.filter(row => {
      if (seen.has(row.slug)) return false
      seen.add(row.slug)
      return true
    }).slice(0, limit),
    degraded: failed.length > 0,
  }
}
