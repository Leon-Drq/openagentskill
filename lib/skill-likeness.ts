export interface SkillLikenessInput {
  fullName?: string | null
  name?: string | null
  description?: string | null
  longDescription?: string | null
  tagline?: string | null
  topics?: string[] | null
  tags?: string[] | null
  frameworks?: string[] | null
  language?: string | null
  category?: string | null
  query?: string | null
  stars?: number | null
}

export interface SkillLikenessProfile {
  score: number
  tier: 'direct-skill' | 'agent-workflow' | 'domain-workflow' | 'ecosystem' | 'generic'
  importReady: boolean
  xShareReady: boolean
  signals: string[]
  penalties: string[]
  reason: string
}

const DIRECT_SKILL_SIGNALS: Array<[string, RegExp, number]> = [
  ['agent-skill', /\bagent[-_\s]?skill(s)?\b/i, 34],
  ['skill-file', /\b(skill\.md|skills?\.json|agent[-_\s]?manifest|openagentskill)\b/i, 32],
  ['skill-name', /(^|[\s/_-])skill(s)?($|[\s/_-])/i, 26],
  ['codex-claude-cursor', /\b(codex|claude code|cursor|gemini cli|aider|windsurf)\b/i, 18],
]

const AGENT_WORKFLOW_SIGNALS: Array<[string, RegExp, number]> = [
  ['agent-workflow', /\bagents?\b.{0,90}\b(workflow|install|use|run|operate|automate|discover|compare|resolve)\b/i, 22],
  ['coding-agent', /\b(coding|code|developer|repo|pull request|test|review)[-_\s]?(agent|workflow|automation|skill)s?\b/i, 22],
  ['browser-agent', /\b(browser[-_\s]?(use|automation)|computer[-_\s]?use|web[-_\s]?agent)\b/i, 20],
  ['research-agent', /\b(research[-_\s]?agent|deep[-_\s]?research|recent[-_\s]?web|last\s?30)\b/i, 20],
  ['automation-workflow', /\b(workflow[-_\s]?automation|task[-_\s]?automation|agent[-_\s]?automation)\b/i, 18],
]

const DOMAIN_WORKFLOW_SIGNALS: Array<[string, RegExp, number]> = [
  ['web-extraction', /\b(crawl4ai|firecrawl|crawler|scraper|scraping|data[-_\s]?extraction|website[-_\s]?to[-_\s]?markdown)\b/i, 18],
  ['presentation', /\b(ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|speaker notes|html slides)\b/i, 18],
  ['finance-analysis', /\b(stock[-_\s]?(analysis|news|research)|sec[-_\s]?filings?|edgar|earnings|portfolio|quant|backtesting|market[-_\s]?data|trading[-_\s]?(bot|research))\b/i, 18],
  ['document-workflow', /\b(pdf[-_\s]?(parsing|parser|extract|ocr)|document[-_\s]?(parser|processing|analysis)|markdown[-_\s]?(conversion|extraction))\b/i, 17],
  ['creative-workflow', /\b(seedance|image[-_\s]?(generation|editing)|video[-_\s]?(generation|editing|workflow)|figma|design[-_\s]?(automation|system))\b/i, 16],
  ['sports-analytics', /\b(world[-_\s]?cup|football[-_\s]?(analytics|data)|soccer[-_\s]?(analytics|data)|xg|match[-_\s]?prediction|statsbomb)\b/i, 16],
  ['marketing-growth', /\b(seo|keyword[-_\s]?research|content[-_\s]?(workflow|automation)|growth[-_\s]?(research|automation)|newsletter)\b/i, 15],
  ['security-review', /\b(security[-_\s]?(review|scanner|automation)|vulnerability[-_\s]?(scanner|analysis)|secret[-_\s]?scanning)\b/i, 15],
  ['legal-education', /\b(contract[-_\s]?analysis|legal[-_\s]?tech|policy[-_\s]?analysis|education|tutoring|course[-_\s]?generation)\b/i, 14],
]

const ECOSYSTEM_SIGNALS: Array<[string, RegExp, number]> = [
  ['llm-tooling', /\b(llm[-_\s]?tool|langchain[-_\s]?tool|openai[-_\s]?plugin|agent[-_\s]?(integration|connector))\b/i, 13],
  ['rag-tooling', /(^|[\s/_-])(rag|vector search|semantic search|knowledge graph)($|[\s/_-])/i, 12],
  ['domain-tooling', /\b(data[-_\s]?(analysis|pipeline|visualization)|business[-_\s]?intelligence|crm|helpdesk|calendar[-_\s]?agent|notes?[-_\s]?agent)\b/i, 12],
]

const GENERIC_FOUNDATION_REPOS = [
  /^angular\/angular$/i,
  /^chalarangelo\/30-seconds-of-code$/i,
  /^docker\/compose$/i,
  /^ebookfoundation\/free-programming-books$/i,
  /^elastic\/elasticsearch$/i,
  /^excalidraw\/excalidraw$/i,
  /^facebook\/react$/i,
  /^freecodecamp\/freecodecamp$/i,
  /^golang\/go$/i,
  /^huggingface\/transformers$/i,
  /^kubernetes\/kubernetes$/i,
  /^microsoft\/typescript$/i,
  /^microsoft\/vscode$/i,
  /^moby\/moby$/i,
  /^nodejs\/node$/i,
  /^ohmyzsh\/ohmyzsh$/i,
  /^pytorch\/pytorch$/i,
  /^rust-lang\/rust$/i,
  /^sveltejs\/svelte$/i,
  /^tensorflow\/tensorflow$/i,
  /^thealgorithms\/python$/i,
  /^torvalds\/linux$/i,
  /^vercel\/next\.js$/i,
  /^vuejs\/core$/i,
]

const GENERIC_FOUNDATION_TEXT =
  /\b(deep[-_\s]?learning framework|machine[-_\s]?learning framework|container orchestration|operating system|programming language|frontend framework|javascript framework|runtime|database engine|distributed system|web framework|ui library|component library|course curriculum|book collection)\b/i

const COLLECTION_TEXT =
  /\b(awesome[-_\s]|curated[-_\s]?(list|collection)|examples?|templates?|starter(s)?|free programming books|roadmap)\b/i

function textFor(input: SkillLikenessInput) {
  return [
    input.fullName,
    input.name,
    input.description,
    input.longDescription,
    input.tagline,
    input.language,
    input.category,
    input.query,
    ...(input.topics || []),
    ...(input.tags || []),
    ...(input.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
}

function addSignals(
  text: string,
  patterns: Array<[string, RegExp, number]>,
  signals: string[]
) {
  let score = 0
  for (const [label, pattern, weight] of patterns) {
    if (pattern.test(text)) {
      signals.push(label)
      score += weight
    }
  }
  return score
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function evaluateSkillLikeness(input: SkillLikenessInput): SkillLikenessProfile {
  const text = textFor(input)
  const signals: string[] = []
  const penalties: string[] = []
  let score = 8

  const directScore = addSignals(text, DIRECT_SKILL_SIGNALS, signals)
  const agentWorkflowScore = addSignals(text, AGENT_WORKFLOW_SIGNALS, signals)
  const domainWorkflowScore = addSignals(text, DOMAIN_WORKFLOW_SIGNALS, signals)
  const ecosystemScore = addSignals(text, ECOSYSTEM_SIGNALS, signals)
  score += directScore + agentWorkflowScore + domainWorkflowScore + ecosystemScore

  if (input.category && input.category !== 'agent-frameworks') score += 4
  if ([...(input.tags || []), ...(input.topics || [])].length > 0) score += 3
  if (input.query && /skill|agent|workflow|automation|codex|claude|cursor|ppt|trading|research/i.test(input.query)) score += 5

  const stars = Math.max(0, Number(input.stars || 0))
  const hasDirectOrAgentWorkflow = directScore > 0 || agentWorkflowScore > 0
  const hasSpecificWorkflow = hasDirectOrAgentWorkflow || domainWorkflowScore >= 16

  if (input.fullName && GENERIC_FOUNDATION_REPOS.some((pattern) => pattern.test(input.fullName || ''))) {
    score -= 46
    penalties.push('generic-foundation-repo')
  }
  if (GENERIC_FOUNDATION_TEXT.test(text) && !hasSpecificWorkflow) {
    score -= 30
    penalties.push('generic-foundation-description')
  }
  if (COLLECTION_TEXT.test(text) && directScore === 0) {
    score -= 12
    penalties.push('collection-like')
  }
  if (stars >= 50_000 && !hasSpecificWorkflow) {
    score = Math.min(score, 44)
    penalties.push('high-star-generic-project')
  }
  if (stars >= 100_000 && directScore === 0 && agentWorkflowScore === 0) {
    score = Math.min(score, 52)
    penalties.push('huge-repo-without-direct-skill-signal')
  }

  const clamped = clampScore(score)
  const tier =
    directScore >= 26
      ? 'direct-skill'
      : agentWorkflowScore >= 18
        ? 'agent-workflow'
        : domainWorkflowScore >= 16
          ? 'domain-workflow'
          : ecosystemScore >= 12
            ? 'ecosystem'
            : 'generic'

  const importReady =
    (tier === 'direct-skill' && clamped >= 45) ||
    (tier === 'agent-workflow' && clamped >= 45) ||
    (tier === 'domain-workflow' && clamped >= 36) ||
    (tier === 'ecosystem' && clamped >= 52)
  const xShareReady =
    (tier === 'direct-skill' && clamped >= 55) ||
    (tier === 'agent-workflow' && clamped >= 55) ||
    (tier === 'domain-workflow' && clamped >= 50)

  return {
    score: clamped,
    tier,
    importReady,
    xShareReady,
    signals,
    penalties,
    reason: importReady
      ? `${tier} signals with ${clamped}/100 skill-likeness`
      : `not specific enough for skill import (${clamped}/100)`,
  }
}
