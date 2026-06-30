import type { SkillRecord } from '@/lib/db/skills'

export interface XCandidateDecision {
  eligible: boolean
  reason: string
  lane: string
  signals: string[]
}

function getSkillShareText(
  skill: SkillRecord,
  options: { includeCategory?: boolean; includeGeneratedSignals?: boolean } = {}
) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    ...(options.includeCategory ? [skill.category] : []),
    skill.github_repo,
    skill.repository,
    ...(options.includeGeneratedSignals ? skill.tags || [] : []),
    ...(options.includeGeneratedSignals ? skill.frameworks || [] : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function getXContentLane(skill: SkillRecord) {
  const text = getSkillShareText(skill, {
    includeCategory: true,
    includeGeneratedSignals: true,
  })

  if (/\b(presentation|presentations|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides)\b/.test(text)) {
    return 'presentation'
  }
  if (/\b(finance|financial|quant|trading|portfolio|markets?|stocks?|equity|earnings|filings?|sec|edgar)\b/.test(text)) {
    return 'finance'
  }
  if (/\b(football|soccer|world cup|fifa|sports?|xg|match|scouting)\b/.test(text)) {
    return 'sports'
  }
  if (/\b(design|creative|figma|motion|animation|video|image|seedance|slides?)\b/.test(text)) {
    return 'creative'
  }
  if (/\b(code review|pull request|repo analysis|test generation|coding agent|claude code|cursor|codex)\b/.test(text)) {
    return 'coding'
  }
  if (/\b(research|rag|retrieval|document|pdf|knowledge|search|recent web|last30)\b/.test(text)) {
    return 'research'
  }
  if (/\b(marketing|seo|growth|content|newsletter|social)\b/.test(text)) {
    return 'growth'
  }
  if (/\b(workflow|automation|browser|scraper|crawler|extractor)\b/.test(text)) {
    return 'automation'
  }

  return 'general'
}

export function isGenericFoundationRepoName(value: string | null | undefined) {
  const repo = (value || '').toLowerCase()
  return [
    /^angular\/angular$/,
    /^chalarangelo\/30-seconds-of-code$/,
    /^docker\/compose$/,
    /^ebookfoundation\/free-programming-books$/,
    /^elastic\/elasticsearch$/,
    /^excalidraw\/excalidraw$/,
    /^facebook\/react$/,
    /^freecodecamp\/freecodecamp$/,
    /^golang\/go$/,
    /^huggingface\/transformers$/,
    /^kubernetes\/kubernetes$/,
    /^microsoft\/typescript$/,
    /^microsoft\/vscode$/,
    /^moby\/moby$/,
    /^nodejs\/node$/,
    /^ohmyzsh\/ohmyzsh$/,
    /^pytorch\/pytorch$/,
    /^rust-lang\/rust$/,
    /^sveltejs\/svelte$/,
    /^tensorflow\/tensorflow$/,
    /^thealgorithms\/python$/,
    /^torvalds\/linux$/,
    /^vercel\/next\.js$/,
    /^vuejs\/core$/,
  ].some((pattern) => pattern.test(repo))
}

function isGenericHighStarRepo(skill: SkillRecord) {
  return isGenericFoundationRepoName(skill.github_repo)
}

function getDirectSkillSignals(text: string) {
  const signals: string[] = []

  const patterns: Array<[string, RegExp]> = [
    ['agent-skill', /\bagent[-_\s]?skill(s)?\b/],
    ['skill-file', /\b(skill\.md|skills?\.json|agent[-_\s]?manifest)\b/],
    ['skill-language', /(^|[\s/_-])skill(s)?($|[\s/_-])/],
    ['agent-runtime', /\b(codex|claude code|cursor|gemini cli|aider|windsurf)\b/],
    ['agent-workflow', /\bagents?\b.{0,80}\b(workflow|install|use|run|operate|automate|discover|compare)\b/],
  ]

  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) signals.push(label)
  }

  return signals
}

function getPracticalWorkflowSignals(text: string) {
  const signals: string[] = []

  const patterns: Array<[string, RegExp]> = [
    ['web-extraction', /\b(crawl4ai|firecrawl|browser[-_\s]?automation|web[-_\s]?(scraping|crawler|extraction)|scrap(e|ing)|crawler|extractor)\b/],
    ['presentation', /\b(ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides)\b/],
    ['finance-analysis', /\b(stock[-_\s]?(analysis|news|research)|sec[-_\s]?filings?|edgar|earnings|portfolio|quant|backtesting|market[-_\s]?data|trading[-_\s]?research)\b/],
    ['recent-research', /\b(last\s?30|recent[-_\s]?web|trend(s|ing)?|hacker news|reddit|youtube|polymarket|bluesky|social[-_\s]?research)\b/],
    ['document-workflow', /\b(pdf[-_\s]?(parsing|extract|ocr)|document[-_\s]?(parser|processing|analysis)|markdown[-_\s]?(conversion|extraction))\b/],
    ['coding-workflow', /\b(code[-_\s]?(review|analysis|quality)|pull[-_\s]?request|repo[-_\s]?(analysis|review)|test[-_\s]?(generation|automation)|ship[-_\s]?workflow)\b/],
    ['creative-workflow', /\b(seedance|image[-_\s]?(generation|editing)|video[-_\s]?(generation|editing|workflow)|figma|design[-_\s]?(automation|system))\b/],
    ['seo-growth', /\b(seo|keyword[-_\s]?research|content[-_\s]?(workflow|automation)|growth[-_\s]?(research|automation)|newsletter)\b/],
    ['sports-analytics', /\b(world[-_\s]?cup|football[-_\s]?(analytics|data)|soccer[-_\s]?(analytics|data)|xg|match[-_\s]?prediction|statsbomb)\b/],
  ]

  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) signals.push(label)
  }

  return signals
}

function hasGenericFoundationSignals(text: string) {
  return /\b(deep[-_\s]?learning framework|machine[-_\s]?learning framework|container orchestration|operating system|programming language|frontend framework|javascript framework|runtime|database engine|distributed system|web framework|ui library)\b/.test(text)
}

export function getXCandidateDecision(skill: SkillRecord, minStars = 500): XCandidateDecision {
  const lane = getXContentLane(skill)
  const text = getSkillShareText(skill, {
    includeCategory: true,
    includeGeneratedSignals: true,
  })
  const directSignals = getDirectSkillSignals(text)
  const workflowSignals = getPracticalWorkflowSignals(text)
  const signals = [...directSignals, ...workflowSignals]

  if (!skill.ai_review_approved) {
    return { eligible: false, reason: 'not-approved', lane, signals }
  }
  if (Number(skill.github_stars || 0) < minStars) {
    return { eligible: false, reason: 'below-star-threshold', lane, signals }
  }
  if (Number(skill.quality_score || 0) < 45) {
    return { eligible: false, reason: 'low-quality-score', lane, signals }
  }
  if (!skill.github_repo) {
    return { eligible: false, reason: 'missing-github-repo', lane, signals }
  }
  if (!skill.description) {
    return { eligible: false, reason: 'missing-description', lane, signals }
  }
  if (isGenericHighStarRepo(skill)) {
    return { eligible: false, reason: 'generic-foundation-repo', lane, signals }
  }
  if (hasGenericFoundationSignals(text) && directSignals.length === 0 && workflowSignals.length === 0) {
    return { eligible: false, reason: 'generic-foundation-description', lane, signals }
  }
  if (directSignals.length === 0 && workflowSignals.length === 0) {
    return { eligible: false, reason: 'not-skill-or-workflow-specific', lane, signals }
  }
  if (lane === 'general' && directSignals.length === 0) {
    return { eligible: false, reason: 'generic-lane-without-skill-signal', lane, signals }
  }

  return { eligible: true, reason: 'skill-or-workflow-specific', lane, signals }
}

export function isGoodXCandidate(skill: SkillRecord, minStars: number) {
  return getXCandidateDecision(skill, minStars).eligible
}
