const QUERY_STOP_WORDS = new Set([
  'about',
  'agent',
  'agents',
  'and',
  'for',
  'from',
  'into',
  'need',
  'right',
  'skill',
  'skills',
  'that',
  'the',
  'this',
  'use',
  'using',
  'want',
  'what',
  'when',
  'with',
])

export function tokenizeQuery(value: string) {
  return value
    .toLowerCase()
    .split(/[\s+,./:_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !QUERY_STOP_WORDS.has(token))
}

export function isLocalizationQuery(normalizedQuery: string, queryTokens: string[]) {
  const tokenSet = new Set(queryTokens)
  const hasDirectLocalizationTerm =
    /\b(locali[sz](?:e|ed|ing|ation)|internationali[sz](?:e|ed|ing|ation)|i18n|translat(?:e|ed|ing|ion)|locale|multilingual)\b/.test(
      normalizedQuery
    )
  const hasChinaLaunchContext =
    /\b(china|chinese|mainland china)\b/.test(normalizedQuery) &&
    /\b(saas|software|product|launch|market|local)\b/.test(normalizedQuery)

  return (
    hasDirectLocalizationTerm ||
    hasChinaLaunchContext ||
    ['localize', 'localise', 'localization', 'localisation', 'i18n'].some((token) => tokenSet.has(token))
  )
}

export function getLocalizationIntentFitScore(category: string, text: string) {
  const categoryMatch = /\b(localization|localisation|translation|internationalization|internationalisation|i18n|market-entry)\b/.test(
    category
  )
  const positiveMatch = /\b(locali[sz](?:e|ed|ing|ation)|internationali[sz](?:e|ed|ing|ation)|i18n|translat(?:e|ed|ing|ion)|locale|multilingual|china|chinese|market-entry)\b/.test(
    text
  )
  const negativeMatch = /\b(web-crawling|crawler|scraper|browser-automation|presentation|slides?|security|vulnerability)\b/.test(
    text
  )

  let score = 0
  if (categoryMatch) score += 140
  if (positiveMatch) score += 120
  if (negativeMatch && !positiveMatch) score -= 170
  if (!categoryMatch && !positiveMatch) score -= 220
  return score
}
