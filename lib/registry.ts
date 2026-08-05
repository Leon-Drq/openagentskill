import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentProvenRankingBoost } from '@/lib/agent-proven'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { buildAgentReadableSkillMetadata } from '@/lib/agent-readable'
import type { SkillAgentStats, SkillEventStats, SkillOutcomeStats, SkillRecord } from '@/lib/db/skills'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import {
  getLocalizationIntentFitScore,
  isLocalizationQuery,
  tokenizeQuery,
} from '@/lib/query-ranking'
import { getSkillAttribution } from '@/lib/skill-attribution'
import { getSkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill, scoreSkillForUseCase, USE_CASES } from '@/lib/use-cases'

const SITE_URL = 'https://www.openagentskill.com'

const QUERY_TOKEN_ALIASES: Record<string, string[]> = {
  trade: ['trading', 'trader', 'trades', 'finance', 'financial', 'stock', 'stocks', 'market', 'markets', 'portfolio', 'quant', 'backtest'],
  trader: ['trade', 'trading', 'finance', 'financial', 'stock', 'stocks', 'market', 'markets', 'portfolio', 'quant', 'backtest'],
  trades: ['trade', 'trading', 'finance', 'financial', 'stock', 'stocks', 'market', 'markets', 'portfolio', 'quant', 'backtest'],
  trading: ['trade', 'trader', 'finance', 'financial', 'stock', 'stocks', 'market', 'markets', 'portfolio', 'quant', 'backtest'],
  invest: ['investment', 'investor', 'finance', 'financial', 'stock', 'stocks', 'market', 'portfolio'],
  investing: ['investment', 'investor', 'finance', 'financial', 'stock', 'stocks', 'market', 'portfolio'],
  investment: ['invest', 'investor', 'finance', 'financial', 'stock', 'stocks', 'market', 'portfolio'],
  market: ['markets', 'finance', 'financial', 'stock', 'stocks', 'equity', 'trading'],
  markets: ['market', 'finance', 'financial', 'stock', 'stocks', 'equity', 'trading'],
  stock: ['stocks', 'equity', 'finance', 'financial', 'market', 'markets', 'earnings', 'trading'],
  stocks: ['stock', 'equity', 'finance', 'financial', 'market', 'markets', 'earnings', 'trading'],
  equity: ['equities', 'stock', 'stocks', 'finance', 'financial', 'market', 'markets'],
  quant: ['quantitative', 'finance', 'financial', 'trading', 'backtesting', 'portfolio'],
  backtest: ['backtesting', 'quant', 'trading', 'finance', 'financial'],
}

type LocalizedIntentAlias = {
  pattern: RegExp
  terms: string[]
}

// Keep the ranking vocabulary language-agnostic. Skills are indexed mainly with
// English GitHub metadata, so a small deterministic bridge is more reliable than
// asking users on localized routes to formulate their task in English.
const LOCALIZED_INTENT_ALIASES: LocalizedIntentAlias[] = [
  {
    pattern: /\b(aktien?|borse|finanzen?|handel|investition|anlage|portfolio|marktrisiko|acciones?|bolsa|finanzas?|inversion|cartera|mercado|saham|pasar|keuangan|investasi|perdagangan|portofolio)\b/,
    terms: ['finance', 'stock', 'market', 'trading'],
  },
  {
    pattern: /\b(prasentation|folien|vortrag|presentacion|diapositivas|laminas|presentasi|slide|dek)\b/,
    terms: ['presentation', 'ppt', 'slides'],
  },
  {
    pattern: /\b(gestalten|schnittstelle|bewegung|diseno|interfaz|animacion|imagen|desain|antarmuka|animasi|gambar)\b/,
    terms: ['design', 'ui', 'animation'],
  },
  {
    pattern: /(视频|剪辑|短片|运镜|补充镜头|素材|电影|片段|视频生成|生成视频)/,
    terms: ['video', 'creative', 'seedance', 'collage', 'b-roll'],
  },
  {
    pattern: /\b(programmierung|repository|repositorio|repositori|fehler|pruefen|testen|codigo|programacion|revisar|prueba|kode|pemrograman|uji|tinjau)\b/,
    terms: ['coding', 'code', 'repository', 'review'],
  },
  {
    pattern: /\b(fussball|weltmeisterschaft|spieler|mannschaft|futbol|mundial|jugador|equipo|partido|sepak bola|piala dunia|pemain|pertandingan)\b/,
    terms: ['football', 'soccer', 'sports', 'analytics'],
  },
  {
    pattern: /\b(forschung|recherche|dokument|quellen|investigacion|documento|articulo|fuentes|penelitian|dokumen|makalah|sumber)\b/,
    terms: ['research', 'document', 'sources'],
  },
  {
    pattern: /\b(webseite|webseiten|crawlen|scrapen|wettbewerber|preise|sitio web|pagina web|rastrear|extraer|competidor|precios|situs|merayapi|ekstrak|pesaing|harga)\b/,
    terms: ['web', 'scraping', 'crawler', 'extraction'],
  },
]

function foldIntentText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function augmentQueryForIntent(value: string) {
  const normalized = foldIntentText(value)
  const terms = new Set<string>()

  for (const alias of LOCALIZED_INTENT_ALIASES) {
    if (alias.pattern.test(normalized)) {
      alias.terms.forEach((term) => terms.add(term))
    }
  }

  return terms.size ? `${value} ${[...terms].join(' ')}` : value
}

function expandQueryTokens(tokens: string[]) {
  const expanded = new Set(tokens)
  for (const token of tokens) {
    for (const alias of QUERY_TOKEN_ALIASES[token] || []) {
      expanded.add(alias)
    }
  }
  return [...expanded]
}

function normalizeCategory(value: string) {
  return value.toLowerCase().replace(/[_\s]+/g, '-')
}

function skillSearchText(skill: SkillRecord) {
  return [
    skill.slug,
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.repository,
    skill.github_repo,
    skill.github_language,
    skill.install_command,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

type QueryIntent = 'finance' | 'localization' | 'presentation' | 'design' | 'coding' | 'sports' | 'research' | 'web' | null

function detectQueryIntent(normalizedQuery: string, queryTokens: string[]): QueryIntent {
  const tokenSet = new Set(queryTokens)

  if (
    /\b(finance|financial|quant|quantitative|trade|trades|trader|trading|invest|investing|investment|portfolio|markets?|stocks?|equity|crypto|filings?|edgar|sec filings?|investor|earnings|10-k|10-q|alpha|factor|backtest|backtesting|risk model)\b/.test(normalizedQuery) ||
    ['trade', 'trades', 'trader', 'trading', 'invest', 'investing', 'investment', 'market', 'markets', 'stock', 'stocks', 'equity', 'quant', 'backtest'].some((token) => tokenSet.has(token))
  ) {
    return 'finance'
  }

  if (isLocalizationQuery(normalizedQuery, queryTokens)) {
    return 'localization'
  }

  if (/\b(presentation|presentations|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides|visual story)\b/.test(normalizedQuery)) {
    return 'presentation'
  }

  if (/\b(design|designer|creative|motion|animation|lottie|gsap|figma|ui|ux|shadcn|component|design system|three|3d|dashboard|visual|svg|image|video|seedance)\b/.test(normalizedQuery)) {
    return 'design'
  }

  if (/\b(code|coding|developer|dev|repo|repos|github|pull request|pr|ci|bug|test|review|ship|codex|claude code|cursor)\b/.test(normalizedQuery)) {
    return 'coding'
  }

  if (/\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/.test(normalizedQuery)) {
    return 'sports'
  }

  if (/\b(research|rag|retrieval|knowledge|document|pdf|paper|papers|arxiv|search|recent|last30|last 30)\b/.test(normalizedQuery)) {
    return 'research'
  }

  if (/\b(websites?|web pages?|pages?|html|crawl|crawler|scrape|scraper|web scraping|pricing|competitor)\b/.test(normalizedQuery)) {
    return 'web'
  }

  return null
}

function getIntentFitScore(intent: QueryIntent, category: string, text: string) {
  if (!intent) return 0
  if (intent === 'localization') return getLocalizationIntentFitScore(category, text)

  const profile: Record<Exclude<QueryIntent, null | 'localization'>, { category: RegExp; positive: RegExp; negative: RegExp }> = {
    finance: {
      category: /\b(finance|financial|quant|trading|market|stock|investment|portfolio|fintech|crypto|defi)\b/,
      positive: /\b(finance|financial|quant|quantitative|trade|trades|trader|trading|portfolio|market-data|markets?|stocks?|stock[-_\s]?analysis|equity|crypto|filings?|edgar|sec filing|investor|investment|earnings|10-k|10-q|alpha|factor|backtest|backtesting|risk model|openbb|vectorbt|freqtrade|yfinance|zipline|backtrader|serenity)\b/,
      negative: /\b(web-crawling|crawler|crawl|scraper|scrape|browser|playwright|puppeteer|presentation|ppt|pptx|slides?|figma|design|creative|security|vulnerability|pdf|document)\b/,
    },
    presentation: {
      category: /\b(design|creative|presentation|media)\b/,
      positive: /\b(presentation|presentations|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides|visual story|notebooklm|guizang|baoyu)\b/,
      negative: /\b(finance|trading|stock|crawler|scraper|security|database|vector|backend)\b/,
    },
    design: {
      category: /\b(design|creative|media|visual)\b/,
      positive: /\b(design|creative|motion|animation|lottie|gsap|figma|ui|ux|shadcn|component|design system|three|3d|dashboard|visual|svg|image|video|seedance)\b/,
      negative: /\b(finance|trading|stock|crawler|scraper|security|database|backend)\b/,
    },
    coding: {
      category: /\b(coding|development|developer|devtools|testing)\b/,
      positive: /\b(code|coding|developer|dev|repo|repos|github|pull request|pr|ci|bug|test|review|ship|codex|claude code|cursor|lint|patch)\b/,
      negative: /\b(presentation|ppt|slides?|trading|stock|football|soccer|marketing)\b/,
    },
    sports: {
      category: /\b(sports|football|soccer|analytics)\b/,
      positive: /\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/,
      negative: /\b(crawler|scraper|security|presentation|ppt|stock|trading|figma)\b/,
    },
    research: {
      category: /\b(research|rag|knowledge|document|data)\b/,
      positive: /\b(research|rag|retrieval|knowledge|document|pdf|paper|papers|arxiv|search|recent|last30|last 30|grounded|sources?)\b/,
      negative: /\b(trading|stock|presentation|ppt|figma|video|football|soccer)\b/,
    },
    web: {
      category: /\b(web|scraping|crawler|automation|data)\b/,
      positive: /\b(web-crawling|crawler|crawl|scraper|scrape|browser|playwright|puppeteer|html|markdown|extraction|llm-friendly|structured data)\b/,
      negative: /\b(finance|trading|stock|presentation|ppt|figma|security|vulnerability)\b/,
    },
  }

  const selected = profile[intent]
  let score = 0
  if (selected.category.test(category)) score += 140
  if (selected.positive.test(text)) score += 120
  if (selected.negative.test(text) && !selected.positive.test(text)) score -= 170
  if (!selected.category.test(category) && !selected.positive.test(text)) score -= 220
  return score
}

function getSpecializedDesignIntentScore(normalizedQuery: string, skill: SkillRecord, text: string) {
  const slug = skill.slug.toLowerCase()
  const isMotionTask = /\b(animation|animate|animated|motion|transition|easing|spring|gesture|momentum|interaction)\b/.test(normalizedQuery)
  let score = 0

  if (/\b(apple|wwdc|ios|fluid interface|gesture-driven|momentum|interruptible|spring animation)\b/.test(normalizedQuery)) {
    if (slug.includes('apple-design') || /\bapple design\b/.test(text)) score += 260
  }

  if (
    isMotionTask &&
    (/\b(name this|name the|what(?:'s| is) (?:this|that) called|what do you call|precise term|right term|vocabulary|glossary)\b/.test(normalizedQuery) ||
      /\bdescribe(?:d)? (?:this|that|an?) (?:animation|motion|effect)\b/.test(normalizedQuery))
  ) {
    if (slug.includes('animation-vocabulary') || /\breverse-lookup (?:animation )?glossary\b/.test(text)) score += 280
    if (slug.includes('review-animations')) score -= 90
  }

  if (
    isMotionTask &&
    /\b(review|audit|critique|inspect|check|evaluate)\b/.test(normalizedQuery)
  ) {
    if (slug.includes('review-animations') || /\banimation-review\b/.test(text)) score += 280
  }

  if (/\b(design engineering|design-engineering|ui polish|interface polish|component polish|interaction details?)\b/.test(normalizedQuery)) {
    if (slug.includes('emil-design-eng') || /\bdesign-engineering\b/.test(text)) score += 240
  }

  const isVideoTask = /\b(video|videos|b[- ]?roll|broll|vox|seedance|clip|clips|film|filmmaking|explainer|motion collage|collage video|vertical video|short[- ]?form|reels?|tiktok|video edit(?:ing)?)\b/.test(normalizedQuery)
  if (isVideoTask) {
    if (slug === 'vox-director') {
      score += /\b(b[- ]?roll|broll|vox|collage|paper collage|explainer|narrated|motion collage|product ad|video ad)\b/.test(normalizedQuery)
        ? 330
        : 90
    }

    if (slug === 'seedance-prompt-en') {
      score += /\b(seedance|camera movement|reference video|video prompt|beat[- ]?match|multimodal video)\b/.test(normalizedQuery)
        ? 330
        : 80
    }
  }

  return score
}

function getSpecializedEngineeringWorkflowScore(normalizedQuery: string, skill: SkillRecord) {
  const slug = skill.slug.toLowerCase()
  const isMattWorkflowSkill =
    slug.startsWith('mattpocock-') ||
    (skill.github_repo || '').toLowerCase() === 'mattpocock/skills'

  if (!isMattWorkflowSkill) return 0

  let score = 0

  if (
    /\b(grill|pressure[- ]?test|challenge (?:a )?plan|domain model|domain glossary|context\.md|architectural decision|adr)\b/.test(
      normalizedQuery
    ) && slug.includes('grill-with-docs')
  ) {
    score += 320
  }

  if (
    /\b(to[- ]?spec|turn .* into (?:a )?(?:spec|prd)|write (?:a )?(?:spec|prd)|create (?:a )?(?:spec|prd)|product requirements document)\b/.test(
      normalizedQuery
    ) && slug.endsWith('to-spec')
  ) {
    score += 330
  }

  if (
    /\b(to[- ]?tickets|break .* into (?:tickets|issues)|ticket breakdown|vertical slices?|blocking (?:edges|relationships)|create (?:engineering )?(?:tickets|issues))\b/.test(
      normalizedQuery
    ) && slug.endsWith('to-tickets')
  ) {
    score += 330
  }

  if (
    /\b(implement (?:the )?(?:spec|ticket|tickets|issue|issues|work)|build from (?:the )?(?:spec|tickets)|execute (?:the )?(?:spec|tickets)|tdd implementation)\b/.test(
      normalizedQuery
    ) && slug.endsWith('implement')
  ) {
    score += 320
  }

  if (
    /\b(code review|review (?:the )?(?:branch|diff|pull request|pr)|review .* against (?:the )?(?:spec|standards)|spec compliance|standards review)\b/.test(
      normalizedQuery
    ) && slug.endsWith('code-review')
  ) {
    score += 330
  }

  return score
}

export function getCanonicalSkillKey(skill: SkillRecord) {
  const repositoryPath = (skill.repository || '').toLowerCase()
  const nestedSkillMatch = repositoryPath.match(
    /github\.com\/([^/]+\/[^/]+)\/(?:tree|blob)\/[^/]+\/(.+?)(?:\/skill\.md)?\/?$/
  )

  if (nestedSkillMatch) {
    return `${nestedSkillMatch[1]}#${nestedSkillMatch[2]}`
  }

  const repo = (skill.github_repo || skill.repository || '')
    .toLowerCase()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\/$/, '')

  if (repo) {
    const [owner, name] = repo.split('/')
    if (owner && name) return `${owner}/${name}`
  }

  return skill.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getNameDuplicateKey(skill: SkillRecord) {
  return skill.name
    .toLowerCase()
    .replace(/\b(ai|agent|skill|tool|server|mcp)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function getSkillUrl(slug: string) {
  return `${SITE_URL}/skills/${slug}`
}

export function getAgentSkillApiUrl(slug: string) {
  return `${SITE_URL}/api/agent/skills/${slug}`
}

export function getSkillInstallApiUrl(slug: string) {
  return `${SITE_URL}/api/skills/${slug}/install`
}

export function getSkillInstallCommand(skill: SkillRecord) {
  return skill.install_command || `npx skills add ${skill.github_repo}`
}

type SkillRankingStats = SkillAgentStats | SkillOutcomeStats

export function normalizeMatchScore(score: number, topScore: number) {
  const safeScore = Math.max(0, Number(score) || 0)
  const denominator = Math.max(100, Number(topScore) || 0)
  if (!safeScore) return 0
  return Math.max(1, Math.min(99, Math.round((safeScore / denominator) * 99)))
}

function getOutcomeUsageScore(stats: SkillRankingStats | null | undefined) {
  if (!stats) return 0
  if ('total_outcomes' in stats) return getAgentProvenRankingBoost(stats)

  const total =
    Number(stats.total_calls || 0)
  const successRate = stats.success_rate === null || stats.success_rate === undefined ? null : Number(stats.success_rate)
  const riskBlocked = 0
  const setupRequired = 0
  const installAttempts = 0

  let score = Math.min(18, Math.log10(total + 1) * 9)
  score += Math.min(8, Math.log10(installAttempts + 1) * 5)

  if (total >= 3 && successRate !== null && Number.isFinite(successRate)) {
    score += Math.max(-18, Math.min(16, (successRate - 65) / 4))
  }

  if (riskBlocked >= 2) score -= Math.min(14, riskBlocked * 2.5)
  if (setupRequired >= 3) score -= Math.min(8, setupRequired * 1.5)

  return score
}

export function rankSkillsForQuery(
  skills: SkillRecord[],
  query: string,
  statsMap: Record<string, SkillRankingStats> = {}
) {
  const rankingQuery = augmentQueryForIntent(query)
  const normalizedQuery = rankingQuery.trim().toLowerCase()
  const compactQuery = normalizedQuery.replace(/[^a-z0-9]+/g, '')
  const queryTokens = tokenizeQuery(rankingQuery)
  const expandedQueryTokens = expandQueryTokens(queryTokens)
  const queryIntent = detectQueryIntent(normalizedQuery, queryTokens)
  const isFinanceQueryIntent = /\b(finance|financial|quant|quantitative|trade|trades|trader|trading|invest|investing|investment|portfolio|markets?|stocks?|equity|crypto|filings?|edgar|sec filings?|investor|earnings|10-k|10-q|alpha|factor|backtest|backtesting|risk model)\b/.test(normalizedQuery) ||
    queryTokens.some((token) => ['trade', 'trades', 'trader', 'trading', 'invest', 'investing', 'investment', 'market', 'markets', 'stock', 'stocks', 'equity', 'quant', 'backtest'].includes(token))

  return skills
    .map((skill) => {
      const text = skillSearchText(skill)
      const name = skill.name.toLowerCase()
      const slug = skill.slug.toLowerCase()
      const category = normalizeCategory(skill.category)
      const repo = (skill.github_repo || skill.repository || '').toLowerCase()
      const install = (skill.install_command || '').toLowerCase()
      const compactName = name.replace(/[^a-z0-9]+/g, '')
      const compactSlug = slug.replace(/[^a-z0-9]+/g, '')
      const compactRepo = repo.replace(/[^a-z0-9]+/g, '')
      const tags = (skill.tags || []).map((tag) => tag.toLowerCase())
      const frameworks = (skill.frameworks || []).map((framework) => framework.toLowerCase())
      let score = 0

      if (!normalizedQuery) {
        score += Number(skill.quality_score || 0)
        score += Math.min(35, Math.log10(Number(skill.github_stars || 0) + 1) * 8)
      } else {
        if (name === normalizedQuery) score += 260
        if (slug === normalizedQuery || repo === normalizedQuery || repo.endsWith(`/${normalizedQuery}`)) score += 230
        if (compactQuery && (compactName === compactQuery || compactSlug === compactQuery || compactRepo.endsWith(compactQuery))) score += 190
        if (name.includes(normalizedQuery)) score += 90
        if (slug.includes(normalizedQuery) || repo.includes(normalizedQuery) || install.includes(normalizedQuery)) score += 72
        if (skill.description.toLowerCase().includes(normalizedQuery)) score += 42
        if (text.includes(normalizedQuery)) score += 28

        for (const token of expandedQueryTokens) {
          const isOriginalToken = queryTokens.includes(token)
          const multiplier = isOriginalToken ? 1 : 0.55

          if (name.includes(token)) score += 30 * multiplier
          if (slug.includes(token) || repo.includes(token) || install.includes(token)) score += 26 * multiplier
          if (tags.some((tag) => tag.includes(token))) score += 24 * multiplier
          if (frameworks.some((framework) => framework.includes(token))) score += 20 * multiplier
          if (category.includes(token)) score += 16 * multiplier
          if (text.includes(token)) score += 8 * multiplier
        }

        for (const useCase of USE_CASES) {
          const useCaseHit =
            normalizedQuery.includes(useCase.slug.replace(/-/g, ' ')) ||
            useCase.keywords.some((keyword) => normalizedQuery.includes(keyword.toLowerCase()))
          if (useCaseHit) score += Math.min(45, scoreSkillForUseCase(skill, useCase) * 4)
        }

        const isGenericWebTask = /\b(websites?|web pages?|pages?|html|crawl|crawler|scrape|scraper|web scraping|pricing|competitor)\b/.test(normalizedQuery)
        const isGenericWebSkill = /\b(web-crawling|crawler|crawl|scraper|scrape|browser|playwright|puppeteer|html|markdown|extraction)\b/.test(text)
        const isLLMReadyWebSkill = /\b(llm-friendly|llm friendly|markdown|structured data|extract structured|web crawler|web scraper)\b/.test(text)
        const isPlatformSpecificExtractor = /\b(google maps|app store|google play|youtube|twitter|x.com|reddit|spotify|instagram|tiktok|linkedin|amazon|ebay|walmart|shopify store)\b/.test(text)
        const isContentTask = /\b(content|blog|post|posts|newsletter|social|copy|copywriting|writing|publish|publishing|product updates?|launch notes?)\b/.test(normalizedQuery)
        const isContentSkill = /\b(content|copywriting|writing|blog|markdown|newsletter|social|summary|summarize|publishing|content-generation|content automation)\b/.test(text)
        const isUnrelatedContentTool = /\b(data-analysis|database|security|scanner|vulnerability|browser-automation|web-automation|testing|qa)\b/.test(text)
        const isFinanceTask = isFinanceQueryIntent
        const isFinanceCategory = /\b(finance|financial|quant|trading|market|stock|investment|portfolio|fintech|crypto|defi)\b/.test(category)
        const isFinanceSkill = /\b(finance|financial|quant|quantitative|trade|trades|trader|trading|portfolio|market-data|markets?|stocks?|stock[-_\s]?analysis|equity|crypto|filings?|edgar|sec filing|investor|investment|earnings|10-k|10-q|alpha|factor|backtest|backtesting|risk model|openbb|vectorbt|freqtrade|yfinance|zipline|backtrader)\b/.test(text) || isFinanceCategory
        const isSecurityOnlySkill = /\b(security|vulnerability|scanner|nuclei|pentest|cve|sast|exploit|secret scanning)\b/.test(text) && !isFinanceSkill
        const isSportsTask = /\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/.test(normalizedQuery)
        const isSportsSkill = /\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/.test(text)
        const isDesignTask = /\b(design|designer|creative|motion|animation|lottie|gsap|figma|ui|ux|shadcn|component|design system|three|3d|map|dashboard|visual|svg)\b/.test(normalizedQuery)
        const isDesignSkill = /\b(design|creative|motion|animation|lottie|gsap|figma|ui|ux|shadcn|component|design system|three|3d|map|dashboard|visual|svg)\b/.test(text)
        const isPresentationTask = /\b(presentation|presentations|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides|visual story)\b/.test(normalizedQuery)
        const isPresentationSkill = /\b(presentation|presentations|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides|visual story|notebooklm|guizang|baoyu)\b/.test(text)
        const isDocumentOnlySkill = /\b(pdf|document|docx|markdown|ocr|converter|convert|parser|parse)\b/.test(text) && !isPresentationSkill

        score += getIntentFitScore(queryIntent, category, text)
        if (isGenericWebTask && isGenericWebSkill) score += 42
        if (isGenericWebTask && isLLMReadyWebSkill) score += 28
        if (isGenericWebTask && isPlatformSpecificExtractor && !normalizedQuery.includes('google maps')) score -= 65
        if (isContentTask && skill.category === 'content-automation') score += 70
        if (isContentTask && isContentSkill) score += 42
        if (isContentTask && isUnrelatedContentTool && !isContentSkill) score -= 55
        if (isFinanceTask && isFinanceCategory) score += 110
        if (isFinanceTask && isFinanceSkill) score += 72
        if (isFinanceTask && isSecurityOnlySkill) score -= 90
        if (isFinanceTask && !isFinanceSkill && (isGenericWebSkill || isPresentationSkill || isDesignSkill || isContentSkill || isDocumentOnlySkill)) score -= 70
        if (isSportsTask && skill.category === 'sports-analytics') score += 85
        if (isSportsTask && isSportsSkill) score += 58
        if (isPresentationTask && skill.category === 'design-creative') score += 50
        if (isPresentationTask && isPresentationSkill) score += 190
        if (isPresentationTask && isDocumentOnlySkill) score -= 90
        if (isDesignTask && skill.category === 'design-creative') score += 78
        if (isDesignTask && isDesignSkill) score += 52
        score += getSpecializedDesignIntentScore(normalizedQuery, skill, text)
        score += getSpecializedEngineeringWorkflowScore(normalizedQuery, skill)
      }

      score += Math.min(24, Number(skill.quality_score || 0) / 4)
      score += Math.min(22, Math.log10(Number(skill.github_stars || 0) + 1) * 5)
      score += Math.min(12, Math.log10(Number(skill.downloads || 0) + 1) * 3)
      score += getOutcomeUsageScore(statsMap[skill.slug])
      if (skill.verified) score += 6

      return { skill, score: Math.round(score * 10) / 10 }
    })
    .filter((item) => !query.trim() || item.score > 18)
    .sort((a, b) => b.score - a.score)
}

export function dedupeRankedSkills<T extends { skill: SkillRecord; score?: number }>(items: T[]) {
  const seenRepoKeys = new Set<string>()
  const seenNames = new Set<string>()
  const deduped: T[] = []

  for (const item of items) {
    const repoKey = getCanonicalSkillKey(item.skill)
    const nameKey = getNameDuplicateKey(item.skill)
    const duplicateByRepo = repoKey && seenRepoKeys.has(repoKey)
    const duplicateByName = nameKey.length >= 5 && seenNames.has(nameKey)

    if (duplicateByRepo || duplicateByName) continue
    if (repoKey) seenRepoKeys.add(repoKey)
    if (nameKey.length >= 5) seenNames.add(nameKey)
    deduped.push(item)
  }

  return deduped
}

export function getRecommendationReasons(skill: SkillRecord, query: string, score?: number) {
  const reasons: string[] = []
  const text = skillSearchText(skill)
  const normalizedQuery = query.trim().toLowerCase()
  const queryTokens = tokenizeQuery(query)
  const matchedTokens = queryTokens.filter((token) => text.includes(token)).slice(0, 4)

  if (matchedTokens.length > 0) {
    reasons.push(`Matches task terms: ${matchedTokens.join(', ')}`)
  }
  if (Number(skill.github_stars || 0) >= 10_000) {
    reasons.push(`Strong GitHub adoption: ${Number(skill.github_stars || 0).toLocaleString()} stars`)
  } else if (Number(skill.github_stars || 0) >= 500) {
    reasons.push(`Useful GitHub adoption: ${Number(skill.github_stars || 0).toLocaleString()} stars`)
  }
  if (Number(skill.quality_score || 0) >= 70) {
    reasons.push(`Quality score ${Math.round(Number(skill.quality_score || 0))}/100`)
  }
  if (skill.install_command || skill.github_repo) {
    reasons.push('Install handoff is available')
  }
  if (skill.github_last_pushed_at) {
    reasons.push('Repository freshness signal is available')
  }
  if (normalizedQuery && score !== undefined) {
    reasons.push(`Registry match score ${Math.round(score)}`)
  }

  return reasons.slice(0, 5)
}

export function toRegistrySkill(skill: SkillRecord, eventStats?: SkillEventStats | null) {
  const quality = getSkillQualityProfile(skill)
  const trust = getSkillTrustProfile(skill, false, eventStats || null)
  const audit = buildSkillAudit(skill, eventStats || null)
  const safety = getAgentSafetyProfile(skill, audit, { max_risk: 'medium', needs_install_command: true })
  const decision = getSkillDecisionProfile(skill, eventStats || null)
  const install = getSkillInstallCommand(skill)
  const attribution = getSkillAttribution(skill)
  const supplyProfile = getSkillSupplyProfile(skill, eventStats || null)
  const agentReadableMetadata = buildAgentReadableSkillMetadata(skill, {
    eventStats: eventStats || null,
  })

  return {
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    tagline: skill.tagline || skill.description,
    category: skill.category,
    tags: skill.tags || [],
    author: {
      name: skill.author_name,
      verified: skill.verified,
      url: skill.author_url,
    },
    attribution,
    stats: {
      stars: Number(skill.github_stars || 0),
      forks: Number(skill.github_forks || 0),
      downloads: Number(skill.downloads || 0),
      rating: Number(skill.rating || 0),
      review_count: Number(skill.review_count || 0),
      quality_score: Number(skill.quality_score || 0),
    },
    quality,
    trust,
    safety,
    safety_gate: {
      tier: safety.safety_tier.tier,
      label: safety.safety_tier.label,
      badge: safety.safety_tier.badge,
      auto_install_policy: safety.safety_tier.auto_install_policy,
      auto_install_allowed: safety.auto_install_allowed,
      human_review_required: safety.human_review_required,
      blocked: safety.blocked,
      recommended_action: safety.safety_tier.recommended_action,
      reasons: safety.safety_tier.reasons,
    },
    supply_profile: supplyProfile,
    audit: {
      audit_score: audit.audit_score,
      risk_level: audit.risk_level,
      risk_label: auditRiskLabel(audit.risk_level),
      warnings: audit.warnings.slice(0, 5),
    },
    decision: {
      readiness_score: decision.readinessScore,
      readiness_label: decision.readinessLabel,
      headline: decision.decisionHeadline,
      role: decision.agentRole,
      primary_fit: decision.primaryFit,
      best_for: decision.bestFor,
      risks: decision.riskNotes,
      next_steps: decision.implementationPlan,
    },
    agent_readable_metadata: agentReadableMetadata,
    machine_metadata: agentReadableMetadata,
    platforms: [...new Set([...(skill.frameworks || []), ...getPlatformHints(skill)])],
    use_cases: getUseCasesForSkill(skill, 4).map((useCase) => ({
      slug: useCase.slug,
      title: useCase.shortTitle,
      url: `${SITE_URL}/use-cases/${useCase.slug}`,
    })),
    install,
    install_targets: getSkillInstallTargets(skill),
    repository: skill.repository,
    github_repo: skill.github_repo,
    version: skill.version,
    license: skill.license,
    updated_at: skill.updated_at,
    canonical_key: getCanonicalSkillKey(skill),
    recommendation_reasons: getRecommendationReasons(skill, '', undefined),
    urls: {
      web: getSkillUrl(skill.slug),
      api: getAgentSkillApiUrl(skill.slug),
      install_api: getSkillInstallApiUrl(skill.slug),
      audit: `${getSkillUrl(skill.slug)}/audit`,
      repository: skill.repository,
    },
  }
}

export function buildInstallHandoff(skill: SkillRecord) {
  const install = getSkillInstallCommand(skill)
  const targets = getSkillInstallTargets(skill)
  const detailUrl = getSkillUrl(skill.slug)
  const audit = buildSkillAudit(skill)
  const safety = getAgentSafetyProfile(skill, audit, { max_risk: 'medium', needs_install_command: true })

  return {
    skill: {
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      repository: skill.repository,
    },
    recommended_command: install,
    install_targets: targets,
    safety_gate: {
      tier: safety.safety_tier.tier,
      label: safety.safety_tier.label,
      badge: safety.safety_tier.badge,
      auto_install_policy: safety.safety_tier.auto_install_policy,
      auto_install_allowed: safety.auto_install_allowed,
      human_review_required: safety.human_review_required,
      blocked: safety.blocked,
      recommended_action: safety.safety_tier.recommended_action,
      reasons: safety.safety_tier.reasons,
    },
    agent_prompt:
      `Install the "${skill.name}" agent skill only after reviewing the OpenAgentSkill profile and source repository. Safety gate: ${safety.safety_tier.label} (${safety.safety_tier.auto_install_policy}). Start with ${detailUrl}, inspect the trust and audit notes, then use the recommended install handoff: ${install}. After installation, summarize changed files, required setup, and a minimal verification result before using the skill for real work.`,
    safety_checklist: [
      `Safety gate: ${safety.safety_tier.label}. Policy: ${safety.safety_tier.auto_install_policy}.`,
      safety.safety_tier.recommended_action,
      'Review the repository and license before running third-party code.',
      'Prefer a sandbox or isolated project when testing a new skill.',
      'Start with the recommended command, then inspect generated files before committing changes.',
      'Do not execute external side effects, payments, account changes, or credentialed actions without explicit user approval.',
    ],
    verification_steps: [
      'Open the skill documentation or SKILL.md and identify required setup.',
      'Run the smallest safe example for the target task.',
      'Confirm outputs match the task before allowing broader agent use.',
      'Record any missing credentials, policy risks, or manual approvals needed.',
    ],
    do_not_auto_install_when: [
      'The repository or license cannot be reviewed.',
      'The skill requires broad credentials or production account access.',
      'The task involves regulated, private, or high-impact data without user approval.',
    ],
    urls: {
      web: detailUrl,
      api: getAgentSkillApiUrl(skill.slug),
      install_api: getSkillInstallApiUrl(skill.slug),
      repository: skill.repository,
    },
    meta: {
      agent_friendly: true,
      api_version: '1.0',
      generated_at: new Date().toISOString(),
    },
  }
}
