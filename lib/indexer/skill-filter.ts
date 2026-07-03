import { evaluateSkillLikeness } from '@/lib/skill-likeness'

export interface SkillCandidateProfile {
  fullName: string
  name?: string
  description?: string | null
  topics?: string[]
  language?: string | null
  query?: string
  category?: string
  stars?: number | null
}

export interface SkillCandidateEvaluation {
  accepted: boolean
  score: number
  reason?: 'mcp' | 'low-relevance'
  signals: string[]
  skillLikenessScore: number
  skillLikenessTier: string
  penalties: string[]
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
  { label: 'document-processing', pattern: /\b(document[-_\s]?(ai|processing|parser)|pdf[-_\s]?(parser|extract|ocr)|ocr)\b/i, weight: 3 },
  { label: 'code-quality', pattern: /\b(code[-_\s]?(review|quality|analysis)|static[-_\s]?analysis|test[-_\s]?(automation|generation)|e2e[-_\s]?test)\b/i, weight: 3 },
  { label: 'data-analysis', pattern: /\b(data[-_\s]?(analysis|analytics|pipeline|visualization)|notebook[-_\s]?agent|csv[-_\s]?(agent|automation))\b/i, weight: 3 },
  { label: 'knowledge-search', pattern: /\b(semantic[-_\s]?search|vector[-_\s]?(search|database)|knowledge[-_\s]?(base|graph|agent))\b/i, weight: 3 },
  { label: 'content-workflow', pattern: /\b(content[-_\s]?(generation|automation|workflow)|copywriting[-_\s]?agent|markdown[-_\s]?(agent|automation))\b/i, weight: 3 },
  { label: 'security-workflow', pattern: /\b(security[-_\s]?(automation|agent|scanner)|vulnerability[-_\s]?(scanner|analysis)|secret[-_\s]?scanning)\b/i, weight: 3 },
  { label: 'finance-workflow', pattern: /\b(finance|financial|quant(itative)?[-_\s]?finance|quantlib|openbb|yfinance|zipline|backtrader|vectorbt|freqtrade|ta[-_\s]?lib|algorithmic[-_\s]?trading|trading[-_\s]?bot|backtesting|stock[-_\s]?market|financial[-_\s]?data|sec[-_\s]?filings|portfolio[-_\s]?(optimization|management)|risk[-_\s]?(model|management)|market[-_\s]?data|fintech|technical[-_\s]?analysis|options[-_\s]?pricing|financial[-_\s]?machine[-_\s]?learning|economic[-_\s]?data|defi[-_\s]?analytics)\b/i, weight: 3 },
  { label: 'research-workflow', pattern: /\b(deep[-_\s]?research|research[-_\s]?agent|market[-_\s]?research|literature[-_\s]?review|arxiv|paper[-_\s]?(search|summarization))\b/i, weight: 3 },
  { label: 'business-automation', pattern: /\b(e[-_\s]?commerce|price[-_\s]?(tracking|monitoring)|lead[-_\s]?generation|sales[-_\s]?automation|business[-_\s]?intelligence)\b/i, weight: 3 },
  { label: 'sports-workflow', pattern: /\b(world[-_\s]?cup|fifa|football[-_\s]?(data|analytics|api)?|soccer[-_\s]?(data|analytics)?|sports[-_\s]?(data|analytics|betting)|statsbomb|expected[-_\s]?goals|match[-_\s]?prediction|fantasy[-_\s]?football|openfootball)\b/i, weight: 3 },
  { label: 'devops-workflow', pattern: /\b(devops[-_\s]?(agent|automation|workflow)|kubernetes[-_\s]?(agent|automation|operator|workflow)|terraform[-_\s]?(agent|automation|workflow)|observability[-_\s]?(agent|automation|workflow)|incident[-_\s]?response|ci[-_\s]?cd[-_\s]?(agent|automation|workflow)|infrastructure[-_\s]?automation)\b/i, weight: 3 },
  { label: 'ml-media-workflow', pattern: /\b(mlops[-_\s]?(agent|automation|workflow)?|image[-_\s]?generation|video[-_\s]?processing|speech[-_\s]?recognition|text[-_\s]?to[-_\s]?speech)\b/i, weight: 3 },
  { label: 'science-workflow', pattern: /\b(geospatial|gis|scientific[-_\s]?computing|bioinformatics|healthcare[-_\s]?data|health[-_\s]?data)\b/i, weight: 3 },
  { label: 'marketing-workflow', pattern: /\b(seo|keyword[-_\s]?research|content[-_\s]?marketing|web[-_\s]?analytics|crm|email[-_\s]?automation|growth[-_\s]?marketing)\b/i, weight: 3 },
  { label: 'design-workflow', pattern: /\b(design[-_\s]?(system|automation|agent|tool)|figma|ui[-_\s]?(generation|design)|ux[-_\s]?research|creative[-_\s]?(automation|coding)|presentation[-_\s]?(design|generation)|image[-_\s]?(generation|editing))\b/i, weight: 3 },
  { label: 'legal-workflow', pattern: /\b(legal[-_\s]?tech|contract[-_\s]?analysis|policy[-_\s]?analysis|privacy|gdpr|compliance[-_\s]?review)\b/i, weight: 3 },
  { label: 'education-workflow', pattern: /\b(education|tutoring|course[-_\s]?generation|quiz[-_\s]?generation|learning[-_\s]?analytics)\b/i, weight: 3 },
  { label: 'support-workflow', pattern: /\b(customer[-_\s]?support|helpdesk|ticket[-_\s]?triage|chatbot|knowledge[-_\s]?base)\b/i, weight: 3 },
  { label: 'productivity-workflow', pattern: /\b(productivity|email[-_\s]?agent|calendar[-_\s]?agent|notes?[-_\s]?agent|task[-_\s]?management|desktop[-_\s]?automation|file[-_\s]?automation)\b/i, weight: 3 },
  { label: 'web3-workflow', pattern: /\b(blockchain|web3|on[-_\s]?chain|defi|smart[-_\s]?contract(s)?|transaction[-_\s]?monitoring)\b/i, weight: 3 },
  { label: 'robotics-workflow', pattern: /\b(robotics|ros|computer[-_\s]?vision|iot|sensor[-_\s]?data)\b/i, weight: 3 },
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
      skillLikenessScore: 0,
      skillLikenessTier: 'generic',
      penalties: ['mcp'],
    }
  }

  const likeness = evaluateSkillLikeness({
    fullName: candidate.fullName,
    name: candidate.name,
    description: candidate.description,
    topics: candidate.topics,
    language: candidate.language,
    category: candidate.category,
    query: candidate.query,
    stars: candidate.stars,
  })
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

  if (candidate.topics?.some((topic) => /skill|agent|automation|workflow|rag|crawler|scraping|browser|document|pdf|ocr|testing|security|semantic-search|vector|finance|quant|trading|backtesting|portfolio|fintech|market-data|risk-management|technical-analysis|options-pricing|research|arxiv|etl|analytics|business-intelligence|ecommerce|sales|world-cup|fifa|football|soccer|sports|statsbomb|fantasy-football|match-prediction|devops-automation|kubernetes-operator|terraform-automation|observability|mlops|geospatial|bioinformatics|seo|marketing|crm|design|figma|ui|ux|creative|presentation|legal|privacy|gdpr|education|tutoring|support|helpdesk|chatbot|productivity|calendar|notes|task-management|desktop-automation|blockchain|web3|defi|robotics|iot/i.test(topic))) {
    score += 1
  }

  if (COLLECTION_PATTERNS.some((pattern) => pattern.test(text))) {
    score -= 3
    signals.push('collection-like')
  }

  return {
    accepted: score >= 4 && likeness.importReady,
    score,
    reason: score >= 4 && likeness.importReady ? undefined : 'low-relevance',
    signals: [...new Set([...signals, ...likeness.signals])],
    skillLikenessScore: likeness.score,
    skillLikenessTier: likeness.tier,
    penalties: likeness.penalties,
  }
}
