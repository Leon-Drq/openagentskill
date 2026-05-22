export interface SkillCandidateProfile {
  fullName: string
  name?: string
  description?: string | null
  topics?: string[]
  language?: string | null
  query?: string
  category?: string
}

export interface SkillCandidateEvaluation {
  accepted: boolean
  score: number
  reason?: 'mcp' | 'low-relevance'
  signals: string[]
}

const MCP_PATTERNS = [
  /(^|[^a-z0-9])mcp([^a-z0-9]|$)/i,
  /\bmcp[-_\s]?(server|tool|client|host|protocol)s?\b/i,
  /\bmodel context protocol\b/i,
]

const POSITIVE_SIGNALS: Array<{ label: string; pattern: RegExp; weight: number }> = [
  { label: 'agent-skill', pattern: /\bagent[-_\s]?skill(s)?\b/i, weight: 6 },
  { label: 'skill', pattern: /(^|[\s/_-])skill(s)?($|[\s/_-])/i, weight: 4 },
  { label: 'agent-framework', pattern: /\bagent[-_\s]?framework(s)?\b/i, weight: 4 },
  { label: 'agent', pattern: /\b(ai[-_\s]?)?agent(s)?\b/i, weight: 3 },
  { label: 'coding-agent', pattern: /\b(coding|code|dev(eloper)?)[-_\s]?agent(s)?\b/i, weight: 4 },
  { label: 'browser-automation', pattern: /\b(browser[-_\s]?use|browser[-_\s]?automation|computer[-_\s]?use)\b/i, weight: 4 },
  { label: 'automation', pattern: /\b(workflow[-_\s]?automation|ai[-_\s]?automation|automation)\b/i, weight: 3 },
  { label: 'rag', pattern: /(^|[\s/_-])rag($|[\s/_-])/i, weight: 3 },
  { label: 'crawler', pattern: /\b(crawler|scraper|scraping|data[-_\s]?extraction)\b/i, weight: 3 },
  { label: 'tool', pattern: /\b(llm[-_\s]?tool|claude[-_\s]?tool|openai[-_\s]?plugin|langchain[-_\s]?tool)\b/i, weight: 3 },
  { label: 'integration', pattern: /\b(agent[-_\s]?(integration|connector)|ai[-_\s]?connector)\b/i, weight: 3 },
]

const COLLECTION_PATTERNS = [
  /\bawesome[-_\s]/i,
  /\bcurated[-_\s]?(list|collection)\b/i,
  /\bexamples?\b/i,
  /\btemplates?\b/i,
  /\bstarter(s)?\b/i,
]

function candidateText(candidate: SkillCandidateProfile) {
  return [
    candidate.fullName,
    candidate.name,
    candidate.description,
    candidate.language,
    candidate.category,
    candidate.query,
    ...(candidate.topics || []),
  ]
    .filter(Boolean)
    .join(' ')
}

export function isMcpCandidate(candidate: SkillCandidateProfile) {
  const text = candidateText(candidate)
  return MCP_PATTERNS.some((pattern) => pattern.test(text))
}

export function evaluateSkillCandidate(candidate: SkillCandidateProfile): SkillCandidateEvaluation {
  const text = candidateText(candidate)

  if (isMcpCandidate(candidate)) {
    return {
      accepted: false,
      score: 0,
      reason: 'mcp',
      signals: ['mcp'],
    }
  }

  const signals: string[] = []
  let score = 0

  for (const signal of POSITIVE_SIGNALS) {
    if (signal.pattern.test(text)) {
      signals.push(signal.label)
      score += signal.weight
    }
  }

  if (candidate.category && candidate.category !== 'agent-frameworks') {
    score += 1
  }

  if (candidate.topics?.some((topic) => /skill|agent|automation|rag|crawler|scraping/i.test(topic))) {
    score += 1
  }

  if (COLLECTION_PATTERNS.some((pattern) => pattern.test(text))) {
    score -= 3
    signals.push('collection-like')
  }

  return {
    accepted: score >= 4,
    score,
    reason: score >= 4 ? undefined : 'low-relevance',
    signals,
  }
}
