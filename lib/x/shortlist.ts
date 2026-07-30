import { getAllSkills, type SkillRecord } from '@/lib/db/skills'
import { getPrimaryInstallCommand } from '@/lib/install-targets'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getXContentLane, isGoodXCandidate } from '@/lib/x/candidates'
import { buildXTrackingUrl, getXShareAssets, type XShareAsset, type XTrackingInput } from '@/lib/x/attribution'

const SITE_URL = 'https://www.openagentskill.com'
const DEFAULT_SHORTLIST_LIMIT = 5
const MIN_SHORTLIST_STARS = 50

export type XShortlistLane =
  | 'coding'
  | 'research'
  | 'finance'
  | 'presentation'
  | 'creative'
  | 'growth'
  | 'automation'
  | 'sports'

interface XShortlistConfig {
  lane: XShortlistLane
  eyebrow: string
  title: string
  description: string
  socialHook: string
  socialLead: string
  skillHref: string
}

export interface XShortlistPick {
  skill: SkillRecord
  role: string
  reason: string
  qualityScore: number
}

export interface XShortlist {
  lane: XShortlistLane
  config: XShortlistConfig
  edition: string
  slug: string
  url: string
  shareAssets: XShareAsset[]
  picks: XShortlistPick[]
  mainText: string
  replyText: string
}

export const X_SHORTLIST_CONFIGS: Record<XShortlistLane, XShortlistConfig> = {
  coding: {
    lane: 'coding',
    eyebrow: 'Claude Code / Codex workflow',
    title: "5 skills I'd add before the next repo task.",
    description:
      'A practical shortlist for agents that need to inspect a repository, make a scoped change, and verify the result before shipping.',
    socialHook: 'You installed Claude Code and stopped there.',
    socialLead: "Here are 5 skills I'd actually add before the next repo task:",
    skillHref: '/skills?category=Coding+Agents',
  },
  research: {
    lane: 'research',
    eyebrow: 'Research and knowledge workflow',
    title: '5 skills for agents that need sources, not guesses.',
    description:
      'A shortlist for research agents that need fresh evidence, document context, retrieval, and a reviewable path to an answer.',
    socialHook: "A research agent is only as useful as the sources it can keep attached.",
    socialLead: "Here are 5 skills I'd use before asking an agent for a research brief:",
    skillHref: '/skills?category=Research',
  },
  finance: {
    lane: 'finance',
    eyebrow: 'Finance and market research workflow',
    title: '5 skills for an agent doing market research.',
    description:
      'A review-first shortlist for agents that need to track filings, organize evidence, analyze market context, and keep the research path inspectable.',
    socialHook: 'Before an agent gives you a market take, give it a research path.',
    socialLead: "Here are 5 skills I'd shortlist for finance and market research:",
    skillHref: '/skills?category=Finance',
  },
  presentation: {
    lane: 'presentation',
    eyebrow: 'Presentation workflow',
    title: '5 skills for the next deck your agent has to make.',
    description:
      'A practical shortlist for turning briefs, source documents, and research notes into editable deck, PPTX, and HTML-slide workflows.',
    socialHook: 'Most agents can draft slides. The useful ones know the deck workflow.',
    socialLead: "Here are 5 skills I'd consider before starting the next presentation:",
    skillHref: '/skill-packs/presentation-agent-pack',
  },
  creative: {
    lane: 'creative',
    eyebrow: 'Design and creative workflow',
    title: '5 skills for design agents that need production handles.',
    description:
      'A shortlist for agents working with product UI, motion, design systems, visuals, and creative review instead of a blank canvas.',
    socialHook: 'Creative agents need more than taste. They need a production workflow.',
    socialLead: "Here are 5 skills I'd add for design and creative work:",
    skillHref: '/skill-packs/design-agent-pack',
  },
  growth: {
    lane: 'growth',
    eyebrow: 'Marketing and growth workflow',
    title: '5 skills for agents doing real growth work.',
    description:
      'A shortlist for marketing agents that need research, content operations, publishing context, and measurement rather than generic copy.',
    socialHook: 'A growth agent is only useful when it can connect research to distribution.',
    socialLead: "Here are 5 skills I'd use for a marketing or growth workflow:",
    skillHref: '/skill-packs/seo-automation-agent-pack',
  },
  automation: {
    lane: 'automation',
    eyebrow: 'Web and workflow automation',
    title: '5 skills for agents that have to do the work twice.',
    description:
      'A shortlist for browser, web-data, and workflow agents that need repeatable extraction and safer automation instead of one-off prompt work.',
    socialHook: 'The best automation is the task your agent does not have to rediscover tomorrow.',
    socialLead: "Here are 5 skills I'd add for web and workflow automation:",
    skillHref: '/skills?category=Web+Scraping',
  },
  sports: {
    lane: 'sports',
    eyebrow: 'Sports analytics workflow',
    title: '5 skills for agents doing football and sports research.',
    description:
      'A shortlist for agents that need match data, scouting context, tournament analysis, and evidence-backed sports research.',
    socialHook: 'Sports agents get more useful when their analysis starts with the right data workflow.',
    socialLead: "Here are 5 skills I'd shortlist for football and sports analysis:",
    skillHref: '/skills?q=football',
  },
}

const SHORTLIST_LANE_ORDER: XShortlistLane[] = [
  'coding',
  'research',
  'finance',
  'presentation',
  'creative',
  'growth',
  'automation',
  'sports',
]

function normalize(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function truncate(value: string, maxLength: number) {
  const normalized = normalize(value)
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function getSearchText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getFreshnessScore(skill: SkillRecord) {
  const date = Date.parse(skill.github_last_pushed_at || skill.updated_at || skill.created_at)
  if (!Number.isFinite(date)) return 0
  const ageDays = Math.max(0, (Date.now() - date) / 86_400_000)
  if (ageDays <= 30) return 14
  if (ageDays <= 90) return 9
  if (ageDays <= 365) return 3
  return 0
}

function getShortlistScore(skill: SkillRecord) {
  const quality = getSkillQualityProfile(skill).score
  const stars = Math.max(0, Number(skill.github_stars || 0))
  return quality * 2 + Math.log10(stars + 10) * 16 + getFreshnessScore(skill) + (skill.verified ? 6 : 0)
}

export function getXShortlistRole(skill: SkillRecord, lane: XShortlistLane) {
  const text = getSearchText(skill)

  if (lane === 'coding') {
    if (/\b(spec|plan|architect|discover|repo analysis|context)\b/.test(text)) return 'Plan'
    if (/\b(review|lint|tests?|testing|qa|verify|debug|audit)\b/.test(text)) return 'Review'
    if (/\b(deploy|release|ci|cd|vercel)\b/.test(text)) return 'Ship'
    if (/\b(build|implement|patch|code generation|ship)\b/.test(text)) return 'Build'
    return 'Workflow'
  }
  if (lane === 'research') {
    if (/\b(pdf|document|markdown|parse|extract|ocr)\b/.test(text)) return 'Read'
    if (/\b(search|retrieval|rag|knowledge|source)\b/.test(text)) return 'Ground'
    if (/\b(recent|trend|last30|reddit|youtube|hacker news|social)\b/.test(text)) return 'Track'
    return 'Research'
  }
  if (lane === 'finance') {
    if (/\b(sec|edgar|filing|earnings)\b/.test(text)) return 'Filings'
    if (/\b(portfolio|quant|backtest|model)\b/.test(text)) return 'Model'
    if (/\b(news|trend|market data|monitor)\b/.test(text)) return 'Monitor'
    return 'Research'
  }
  if (lane === 'presentation') {
    if (/\b(ppt|pptx|powerpoint|editable)\b/.test(text)) return 'Deck'
    if (/\b(html slides|speaker notes|keynote)\b/.test(text)) return 'Present'
    if (/\b(design|visual|layout)\b/.test(text)) return 'Polish'
    return 'Frame'
  }
  if (lane === 'creative') {
    if (/\b(figma|design system|ui|ux|component)\b/.test(text)) return 'Design'
    if (/\b(video|motion|animation|lottie|gsap)\b/.test(text)) return 'Produce'
    if (/\b(image|visual|brand)\b/.test(text)) return 'Visual'
    return 'Create'
  }
  if (lane === 'growth') {
    if (/\b(seo|keyword|search)\b/.test(text)) return 'Discover'
    if (/\b(content|newsletter|social|copy)\b/.test(text)) return 'Publish'
    if (/\b(analytics|measure|metrics)\b/.test(text)) return 'Measure'
    return 'Grow'
  }
  if (lane === 'automation') {
    if (/\b(browser|playwright|puppeteer|web)\b/.test(text)) return 'Browse'
    if (/\b(scrap|crawl|extract|monitor)\b/.test(text)) return 'Extract'
    if (/\b(workflow|automation|schedule)\b/.test(text)) return 'Automate'
    return 'Operate'
  }
  if (lane === 'sports') {
    if (/\b(data|statsbomb|xg|match)\b/.test(text)) return 'Data'
    if (/\b(scout|player|team)\b/.test(text)) return 'Scout'
    if (/\b(tournament|world cup|fixture)\b/.test(text)) return 'Track'
    return 'Analyze'
  }

  return 'Workflow'
}

function getRoleReason(skill: SkillRecord, lane: XShortlistLane, role: string) {
  const description = normalize(skill.description || skill.long_description)
  const roleFirstReasons: Partial<Record<XShortlistLane, Record<string, string>>> = {
    coding: {
      Plan: 'turns repository context into a usable starting plan',
      Build: 'makes implementation work more repeatable',
      Review: 'adds a verification step before shipping',
      Workflow: 'gives coding agents a reusable operating path',
    },
    research: {
      Read: 'helps an agent work through source documents',
      Ground: 'keeps answers tied to retrievable evidence',
      Track: 'adds fresher signals to the research loop',
      Research: 'gives the agent a repeatable research surface',
    },
    finance: {
      Filings: 'helps anchor a market view in primary documents',
      Model: 'makes analysis and scenario work more repeatable',
      Monitor: 'adds a path for tracking market context',
      Research: 'keeps financial research inspectable',
    },
    presentation: {
      Deck: 'focuses on editable deck output, not just slide images',
      Present: 'helps connect a narrative to a usable presentation',
      Polish: 'adds visual review before export',
      Frame: 'turns source material into a clearer deck workflow',
    },
    creative: {
      Design: 'helps the agent work within product UI constraints',
      Produce: 'adds an editable production path for motion or video',
      Visual: 'connects a visual brief to a more usable output',
      Create: 'gives creative work a repeatable handoff',
    },
    growth: {
      Discover: 'helps connect search intent to the next action',
      Publish: 'turns a content task into a reusable workflow',
      Measure: 'keeps distribution tied to a measurable loop',
      Grow: 'connects research, publishing, and feedback',
    },
    automation: {
      Browse: 'gives agents a more reliable web surface',
      Extract: 'turns repeat web work into structured input',
      Automate: 'makes repeatable operations easier to replay',
      Operate: 'adds a reusable path for recurring work',
    },
    sports: {
      Data: 'starts the analysis from a real sports data surface',
      Scout: 'adds a structured path for player or team context',
      Track: 'helps keep tournament context current',
      Analyze: 'turns match context into a repeatable research flow',
    },
  }

  return roleFirstReasons[lane]?.[role] || truncate(description, 64)
}

function buildSocialMainText(config: XShortlistConfig, picks: XShortlistPick[], url: string) {
  for (let count = Math.min(picks.length, 5); count >= 3; count -= 1) {
    const list = picks
      .slice(0, count)
      .map((pick) => `${pick.role} -> ${truncate(pick.skill.name, 28)}`)
      .join('\n')
    const text = [
      config.socialHook,
      '',
      config.socialLead,
      '',
      list,
      '',
      'Full shortlist, audit scores, and install paths:',
      url,
    ].join('\n')
    if (getXTextLength(text) <= 280) return text
  }

  return [
    config.socialHook,
    '',
    config.socialLead,
    '',
    `Full shortlist: ${url}`,
  ].join('\n')
}

function buildSocialReplyText(picks: XShortlistPick[]) {
  for (let count = Math.min(picks.length, 5); count >= 3; count -= 1) {
    const lines = picks
      .slice(0, count)
      .map((pick, index) => `${index + 1}. ${truncate(pick.skill.name, 30)} - ${truncate(pick.reason, 44)}`)
    const text = ['Why each made the list:', '', ...lines, '', 'Review the audit and install path before adding one to a workspace.'].join('\n')
    if (getXTextLength(text) <= 280) return text
  }

  return 'Each pick has a public audit and install path. Review the repository before adding it to a real workspace.'
}

function getXTextLength(value: string) {
  return value.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length
}

export function getXShortlistEdition(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function isXShortlistLane(value: string): value is XShortlistLane {
  return Object.hasOwn(X_SHORTLIST_CONFIGS, value)
}

export function getXShortlistLaneForDate(
  skills: SkillRecord[],
  date = new Date(),
  offset = 0
): XShortlistLane | null {
  const eligibleLanes = SHORTLIST_LANE_ORDER.filter((lane) =>
    skills.filter((skill) => getXContentLane(skill) === lane && isGoodXCandidate(skill, MIN_SHORTLIST_STARS)).length >= 3
  )

  if (!eligibleLanes.length) return null

  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000)
  return eligibleLanes[Math.abs(day + offset) % eligibleLanes.length]
}

export function buildXShortlist(
  lane: XShortlistLane,
  skills: SkillRecord[],
  options: {
    limit?: number
    edition?: string
    tracking?: XTrackingInput
    excludeSkillSlugs?: Iterable<string>
  } = {}
): XShortlist {
  const config = X_SHORTLIST_CONFIGS[lane]
  const limit = Math.min(Math.max(options.limit || DEFAULT_SHORTLIST_LIMIT, 3), 5)
  const edition = options.edition || getXShortlistEdition()
  const excludedSlugs = new Set(options.excludeSkillSlugs || [])
  const ranked = skills
    .filter((skill) => getXContentLane(skill) === lane)
    .filter((skill) => isGoodXCandidate(skill, MIN_SHORTLIST_STARS))
    .filter((skill) => !excludedSlugs.has(skill.slug))
    .map((skill) => ({ skill, role: getXShortlistRole(skill, lane), score: getShortlistScore(skill) }))
    .sort((left, right) => right.score - left.score || Number(right.skill.github_stars || 0) - Number(left.skill.github_stars || 0))

  const selected: XShortlistPick[] = []
  const seenSlugs = new Set<string>()
  const seenRoles = new Set<string>()
  for (const candidate of ranked) {
    if (selected.length >= limit) break
    if (seenRoles.has(candidate.role)) continue
    seenRoles.add(candidate.role)
    seenSlugs.add(candidate.skill.slug)
    selected.push({
      skill: candidate.skill,
      role: candidate.role,
      reason: getRoleReason(candidate.skill, lane, candidate.role),
      qualityScore: getSkillQualityProfile(candidate.skill).score,
    })
  }
  for (const candidate of ranked) {
    if (selected.length >= limit) break
    if (seenSlugs.has(candidate.skill.slug)) continue
    seenSlugs.add(candidate.skill.slug)
    selected.push({
      skill: candidate.skill,
      role: candidate.role,
      reason: getRoleReason(candidate.skill, lane, candidate.role),
      qualityScore: getSkillQualityProfile(candidate.skill).score,
    })
  }

  const slug = `task-shortlist-${lane}-${edition}`
  const defaultUrl = `${SITE_URL}/shortlists/${lane}?ref=x&edition=${edition}`
  const url = options.tracking
    ? buildXTrackingUrl(`/shortlists/${lane}?edition=${encodeURIComponent(edition)}`, options.tracking)
    : defaultUrl
  return {
    lane,
    config,
    edition,
    slug,
    url,
    shareAssets: options.tracking
      ? getXShareAssets(lane, edition, options.tracking.content)
      : [],
    picks: selected,
    mainText: buildSocialMainText(config, selected, url),
    replyText: buildSocialReplyText(selected),
  }
}

export async function getXShortlist(
  lane: XShortlistLane,
  options: { limit?: number; edition?: string; candidateLimit?: number } = {}
) {
  const skills = await getAllSkills('quality', undefined, Math.min(Math.max(options.candidateLimit || 1200, 120), 4000))
  return buildXShortlist(lane, skills, options)
}

export function getXShortlistInstallCommand(skill: SkillRecord) {
  return getPrimaryInstallCommand(skill)
}

export function getXShortlistStars(skill: SkillRecord) {
  return `${formatCompactNumber(Number(skill.github_stars || 0))} stars`
}
