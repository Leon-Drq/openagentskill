const MISSING_LICENSE_ISSUE =
  /(?:\bno\b|\bmissing\b|\bwithout\b|\black(?:s|ing)?\b|\bnot\s+(?:present|found|provided|declared|specified)\b).{0,80}\blicen[cs]e\b|\blicen[cs]e\b.{0,80}(?:\bmissing\b|\bnot\s+(?:present|found|provided|declared|specified)\b)/i

const ADD_LICENSE_SUGGESTION =
  /\b(?:add|include|declare|provide|specify|choose)\b.{0,100}\blicen[cs]e\b/i

export function hasDeclaredRepositoryLicense(license?: string | null) {
  const value = license?.trim().toLowerCase()
  return Boolean(value && !['unknown', 'noassertion', 'other', 'none'].includes(value))
}

export function reconcileLicenseReviewFeedback(
  license: string | null | undefined,
  issues: string[],
  suggestions: string[]
) {
  if (!hasDeclaredRepositoryLicense(license)) return { issues, suggestions }

  return {
    issues: issues.filter((item) => !MISSING_LICENSE_ISSUE.test(item)),
    suggestions: suggestions.filter((item) => !ADD_LICENSE_SUGGESTION.test(item)),
  }
}
