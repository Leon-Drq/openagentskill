import type { SkillEventDailyStats, SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { getFreshnessDays, getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'

export interface GrowthRankedSkill {
  skill: SkillRecord
  rank: number
  score: number
  badge: string
  reason: string
}

export interface SkillDailyEventSummary {
  total_events: number
  views: number
  install_copies: number
  saves: number
  compares: number
  outbound_clicks: number
  claim_starts: number
  claim_submits: number
  weighted_engagement: number
  latest_event_at: string | null
}

export interface AgentProfile {
  slug: string
  name: string
  shortName: string
  eyebrow: string
  description: string
  keywords: string[]
  workflows: string[]
}

export interface OfficialCreator {
  slug: string
  name: string
  repoOwners: string[]
  description: string
  focus: string
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    slug: 'claude-code',
    name: 'Claude Code',
    shortName: 'Claude Code',
    eyebrow: 'Anthropic workflows',
    description:
      'Skills that help Claude Code handle repository work, procedural knowledge, documents, design, and repeatable engineering tasks.',
    keywords: ['claude', 'anthropic', 'skill', 'skills', 'markdown', 'coding', 'repository', 'design', 'review'],
    workflows: ['Repository analysis', 'Design and frontend tasks', 'Document and artifact workflows'],
  },
  {
    slug: 'codex',
    name: 'Codex',
    shortName: 'Codex',
    eyebrow: 'OpenAI coding agents',
    description:
      'Skills for Codex-style coding agents that need repository context, browser checks, GitHub workflows, and precise implementation guidance.',
    keywords: ['codex', 'openai', 'github', 'repository', 'code', 'coding', 'terminal', 'browser', 'review', 'test'],
    workflows: ['Patch and verify code', 'Inspect pull requests', 'Run browser-based product checks'],
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    shortName: 'Cursor',
    eyebrow: 'IDE agents',
    description:
      'Skills for Cursor users who want better code generation, UI design, testing, architecture review, and project-specific workflows.',
    keywords: ['cursor', 'ide', 'vscode', 'editor', 'developer', 'frontend', 'typescript', 'react', 'review'],
    workflows: ['Frontend implementation', 'Code review', 'Project navigation'],
  },
  {
    slug: 'github-copilot',
    name: 'GitHub Copilot',
    shortName: 'Copilot',
    eyebrow: 'GitHub-native agents',
    description:
      'Skills that fit GitHub Copilot workflows around issues, pull requests, Actions, releases, repository automation, and code review.',
    keywords: ['github', 'copilot', 'pull request', 'issue', 'actions', 'ci', 'repository', 'release', 'review'],
    workflows: ['Pull request review', 'Issue triage', 'Release and changelog automation'],
  },
  {
    slug: 'windsurf',
    name: 'Windsurf',
    shortName: 'Windsurf',
    eyebrow: 'Codeium workflows',
    description:
      'Skills for Windsurf-style coding agents that need frontend taste, full-stack implementation, test coverage, and local project context.',
    keywords: ['windsurf', 'codeium', 'ide', 'coding', 'frontend', 'react', 'typescript', 'testing', 'debug'],
    workflows: ['Full-stack changes', 'UI implementation', 'Debugging and test repair'],
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    shortName: 'Gemini',
    eyebrow: 'Google agent workflows',
    description:
      'Skills for Gemini agents across research, multimodal analysis, Google ecosystem work, coding, and browser-assisted tasks.',
    keywords: ['gemini', 'google', 'vertex', 'ai studio', 'research', 'multimodal', 'browser', 'coding'],
    workflows: ['Multimodal research', 'Google ecosystem tasks', 'Code and browser workflows'],
  },
  {
    slug: 'cline',
    name: 'Cline',
    shortName: 'Cline',
    eyebrow: 'VS Code agents',
    description:
      'Skills for Cline users who rely on terminal commands, browser automation, local file operations, debugging, and repository edits.',
    keywords: ['cline', 'vscode', 'terminal', 'browser', 'file', 'repository', 'debug', 'test', 'automation'],
    workflows: ['Local project changes', 'Browser verification', 'Terminal-driven automation'],
  },
  {
    slug: 'amp',
    name: 'AMP',
    shortName: 'AMP',
    eyebrow: 'Engineering agents',
    description:
      'Skills for AMP-style engineering agents focused on codebase understanding, implementation planning, reviews, and systematic debugging.',
    keywords: ['amp', 'sourcegraph', 'codebase', 'architecture', 'debugging', 'review', 'repository', 'planning'],
    workflows: ['Codebase intake', 'Architecture review', 'Systematic debugging'],
  },
  {
    slug: 'antigravity',
    name: 'Antigravity',
    shortName: 'Antigravity',
    eyebrow: 'Agentic IDE workflows',
    description:
      'Skills that fit Antigravity-style workflows for coding, browser use, research, UI building, and agent-to-agent task execution.',
    keywords: ['antigravity', 'agent', 'coding', 'browser', 'gemini', 'google', 'frontend', 'automation'],
    workflows: ['Agentic coding', 'Browser operation', 'Research-to-implementation work'],
  },
]

export const OFFICIAL_CREATORS: OfficialCreator[] = [
  {
    slug: 'anthropic',
    name: 'Anthropic',
    repoOwners: ['anthropics', 'anthropic'],
    description: 'Claude and agent-skill workflows from Anthropic-owned repositories.',
    focus: 'Claude skills',
  },
  {
    slug: 'openai',
    name: 'OpenAI',
    repoOwners: ['openai'],
    description: 'OpenAI and Codex-related skills for model, agent, and developer workflows.',
    focus: 'OpenAI agents',
  },
  {
    slug: 'vercel',
    name: 'Vercel',
    repoOwners: ['vercel', 'vercel-labs'],
    description: 'Vercel and Vercel Labs skills for frontend, deployment, browser, and agent workflows.',
    focus: 'Web development',
  },
  {
    slug: 'microsoft',
    name: 'Microsoft',
    repoOwners: ['microsoft'],
    description: 'Azure, Copilot, cloud, and enterprise skills published from Microsoft repositories.',
    focus: 'Cloud and Copilot',
  },
  {
    slug: 'google',
    name: 'Google',
    repoOwners: ['google', 'google-gemini', 'google-labs-code', 'firebase'],
    description: 'Google, Gemini, Firebase, and Google Labs skills for developer and AI workflows.',
    focus: 'Gemini and Firebase',
  },
  {
    slug: 'supabase',
    name: 'Supabase',
    repoOwners: ['supabase'],
    description: 'Supabase skills for Postgres, auth, edge functions, storage, and app development.',
    focus: 'Databases',
  },
  {
    slug: 'github',
    name: 'GitHub',
    repoOwners: ['github'],
    description: 'GitHub-native skills for repositories, Copilot, Actions, and developer automation.',
    focus: 'Developer workflows',
  },
  {
    slug: 'firecrawl',
    name: 'Firecrawl',
    repoOwners: ['firecrawl'],
    description: 'Firecrawl skills for crawling, scraping, and agent-ready web extraction.',
    focus: 'Web scraping',
  },
  {
    slug: 'browser-use',
    name: 'Browser Use',
    repoOwners: ['browser-use'],
    description: 'Browser-use skills and browser automation workflows for AI agents.',
    focus: 'Browser agents',
  },
  {
    slug: 'langchain',
    name: 'LangChain',
    repoOwners: ['langchain-ai'],
    description: 'LangChain skills for agent engineering, RAG, tools, memory, and workflow orchestration.',
    focus: 'Agent frameworks',
  },
  {
    slug: 'n8n',
    name: 'n8n',
    repoOwners: ['n8n-io'],
    description: 'n8n skills for workflow automation, integrations, and operations agents.',
    focus: 'Workflow automation',
  },
  {
    slug: 'remotion',
    name: 'Remotion',
    repoOwners: ['remotion-dev'],
    description: 'Remotion skills for programmatic video, media workflows, and creative automation.',
    focus: 'Video generation',
  },
  {
    slug: 'neon',
    name: 'Neon',
    repoOwners: ['neondatabase'],
    description: 'Neon skills for serverless Postgres, database apps, and data workflows.',
    focus: 'Postgres',
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    repoOwners: ['stripe'],
    description: 'Stripe skills for payments, billing, subscriptions, and business operations.',
    focus: 'Payments',
  },
  {
    slug: 'cloudflare',
    name: 'Cloudflare',
    repoOwners: ['cloudflare'],
    description: 'Cloudflare skills for edge apps, workers, security, and web infrastructure.',
    focus: 'Edge infrastructure',
  },
  {
    slug: 'shopify',
    name: 'Shopify',
    repoOwners: ['shopify'],
    description: 'Shopify skills for commerce, storefronts, checkout, and merchant workflows.',
    focus: 'Commerce',
  },
  {
    slug: 'sentry',
    name: 'Sentry',
    repoOwners: ['getsentry', 'sentry'],
    description: 'Sentry skills for observability, error monitoring, release health, and debugging.',
    focus: 'Observability',
  },
  {
    slug: 'hugging-face',
    name: 'Hugging Face',
    repoOwners: ['huggingface'],
    description: 'Hugging Face skills for models, datasets, inference, and ML workflows.',
    focus: 'Models and data',
  },
  {
    slug: 'apify',
    name: 'Apify',
    repoOwners: ['apify'],
    description: 'Apify skills for crawling, automation, and data extraction workflows.',
    focus: 'Crawling',
  },
]

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function repoOwner(skill: SkillRecord) {
  const repo = (skill.github_repo || skill.repository || '').trim()
  const normalized = repo.replace(/^https?:\/\/github\.com\//i, '').replace(/^github\.com\//i, '')
  return normalized.split('/')[0]?.toLowerCase() || ''
}

function skillText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    skill.github_language,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function dateScore(value: string | null | undefined, maxDays: number) {
  const days = getFreshnessDays(value)
  if (days === null) return 0
  return Math.max(0, 1 - Math.min(days, maxDays) / maxDays)
}

function eventRecencyScore(stats?: SkillEventStats | null) {
  if (!stats?.last_event_at) return 0
  return dateScore(stats.last_event_at, 14)
}

function dailyEngagement(row: SkillEventDailyStats) {
  return (
    (row.views || 0) +
    (row.install_copies || 0) * 8 +
    (row.compares || 0) * 5 +
    (row.outbound_clicks || 0) * 4 +
    (row.saves || 0) * 4 +
    (row.claim_starts || 0) * 6 +
    (row.claim_submits || 0) * 10
  )
}

export function summarizeSkillDailyStats(rows?: SkillEventDailyStats[] | null): SkillDailyEventSummary {
  const sorted = [...(rows || [])].sort((a, b) => a.event_date.localeCompare(b.event_date))
  const summary: SkillDailyEventSummary = {
    total_events: 0,
    views: 0,
    install_copies: 0,
    saves: 0,
    compares: 0,
    outbound_clicks: 0,
    claim_starts: 0,
    claim_submits: 0,
    weighted_engagement: 0,
    latest_event_at: null,
  }

  for (const [index, row] of sorted.entries()) {
    const recencyWeight = 0.65 + ((index + 1) / Math.max(1, sorted.length)) * 0.7
    summary.total_events += Number(row.total_events || 0)
    summary.views += Number(row.views || 0)
    summary.install_copies += Number(row.install_copies || 0)
    summary.saves += Number(row.saves || 0)
    summary.compares += Number(row.compares || 0)
    summary.outbound_clicks += Number(row.outbound_clicks || 0)
    summary.claim_starts += Number(row.claim_starts || 0)
    summary.claim_submits += Number(row.claim_submits || 0)
    summary.weighted_engagement += dailyEngagement(row) * recencyWeight
    if (row.last_event_at && (!summary.latest_event_at || row.last_event_at > summary.latest_event_at)) {
      summary.latest_event_at = row.last_event_at
    }
  }

  return summary
}

function officialMatch(skill: SkillRecord, creator: OfficialCreator) {
  const owner = repoOwner(skill)
  if (creator.repoOwners.includes(owner)) return true
  const repo = (skill.github_repo || skill.repository || '').toLowerCase()
  return creator.repoOwners.some((candidate) => repo.includes(`${candidate}/`))
}

export function getOfficialCreator(slug: string) {
  return OFFICIAL_CREATORS.find((creator) => creator.slug === slug)
}

export function getAgentProfile(slug: string) {
  return AGENT_PROFILES.find((profile) => profile.slug === slug)
}

export function getSkillsForOfficialCreator(
  skills: SkillRecord[],
  creator: OfficialCreator,
  limit = 60
): GrowthRankedSkill[] {
  return skills
    .filter((skill) => officialMatch(skill, creator))
    .map((skill) => {
      const quality = getSkillQualityProfile(skill)
      const trust = getSkillTrustProfile(skill)
      const freshness = dateScore(skill.github_last_pushed_at || skill.updated_at, 365)
      const score = quality.score * 0.48 + trust.score * 0.34 + freshness * 12 + Math.log10(Math.max(1, skill.github_stars || 1)) * 4
      return {
        skill,
        score,
        badge: `${quality.label} · ${quality.score}`,
        reason: `${creator.name} repository match with ${quality.label.toLowerCase()} quality, ${trust.label.toLowerCase()}, and current maintenance signals.`,
      }
    })
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export function getOfficialCreatorSummaries(skills: SkillRecord[]) {
  return OFFICIAL_CREATORS
    .map((creator) => {
      const ranked = getSkillsForOfficialCreator(skills, creator, 6)
      const totalStars = ranked.reduce((sum, item) => sum + Number(item.skill.github_stars || 0), 0)
      return {
        creator,
        ranked,
        totalStars,
        skillCount: skills.filter((skill) => officialMatch(skill, creator)).length,
      }
    })
    .filter((summary) => summary.skillCount > 0)
    .sort((a, b) => b.skillCount - a.skillCount || b.totalStars - a.totalStars)
}

export function scoreSkillForAgent(skill: SkillRecord, profile: AgentProfile) {
  const text = skillText(skill)
  let match = 0
  for (const keyword of profile.keywords) {
    const normalized = keyword.toLowerCase()
    if (text.includes(normalized)) match += normalized.includes(' ') ? 6 : 3
  }

  if (profile.slug === 'codex' || profile.slug === 'cursor' || profile.slug === 'windsurf') {
    if (/typescript|react|next|github|test|review|frontend|code|repository/.test(text)) match += 4
  }

  if (profile.slug === 'claude-code' && /skill|markdown|document|artifact|design/.test(text)) match += 5
  if (profile.slug === 'github-copilot' && /github|pull request|issue|actions/.test(text)) match += 6
  if (profile.slug === 'gemini' && /google|gemini|multimodal|research/.test(text)) match += 5

  const quality = getSkillQualityProfile(skill)
  const trust = getSkillTrustProfile(skill)
  const adoption = Math.min(14, Math.log10(Math.max(1, skill.github_stars || 1)) * 3)
  return match * 3 + quality.score * 0.24 + trust.score * 0.18 + adoption
}

export function rankSkillsForAgent(skills: SkillRecord[], profile: AgentProfile, limit = 36): GrowthRankedSkill[] {
  return skills
    .map((skill) => {
      const score = scoreSkillForAgent(skill, profile)
      const quality = getSkillQualityProfile(skill)
      const trust = getSkillTrustProfile(skill)
      return {
        skill,
        score,
        badge: `${clampScore(score)} fit`,
        reason: `${quality.label} quality, ${trust.label.toLowerCase()}, and a strong fit for ${profile.shortName} workflows.`,
      }
    })
    .filter((item) => item.score >= 24)
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export function rankTrendingSkills(
  skills: SkillRecord[],
  eventStatsMap: Record<string, SkillEventStats>,
  dailyStatsMap: Record<string, SkillEventDailyStats[]> = {},
  limit = 48
): GrowthRankedSkill[] {
  return skills
    .map((skill) => {
      const stats = eventStatsMap[skill.slug]
      const daily = summarizeSkillDailyStats(dailyStatsMap[skill.slug])
      const quality = getSkillQualityProfile(skill)
      const trust = getSkillTrustProfile(skill, false, stats)
      const aggregateEngagement =
        (stats?.views || 0) +
        (stats?.install_copies || 0) * 8 +
        (stats?.compares || 0) * 5 +
        (stats?.outbound_clicks || 0) * 4 +
        (stats?.saves || 0) * 4
      const hasRecentActivity = daily.total_events > 0
      const engagement = hasRecentActivity ? daily.weighted_engagement : aggregateEngagement
      const recency = (daily.latest_event_at ? dateScore(daily.latest_event_at, 10) : eventRecencyScore(stats)) * 22
      const score =
        engagement * 1.8 +
        recency +
        quality.score * 0.2 +
        trust.score * 0.12 +
        Math.log10(Math.max(1, skill.github_stars || 1)) * 5
      return {
        skill,
        score,
        badge: hasRecentActivity
          ? `${daily.total_events} events / 7d`
          : stats?.total_events
            ? `${stats.total_events} events`
            : `${quality.label} · ${quality.score}`,
        reason: hasRecentActivity
          ? `${daily.views} views, ${daily.install_copies} install copies, and ${daily.compares} compares in the last 7 days, plus ${quality.label.toLowerCase()} quality signals.`
          : stats?.total_events
            ? `${stats.views} views, ${stats.install_copies} install copies, and ${quality.label.toLowerCase()} quality signals.`
          : `${quality.label} quality with strong adoption signals; usage events will lift it as people interact.`,
      }
    })
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export function rankHotSkills(
  skills: SkillRecord[],
  eventStatsMap: Record<string, SkillEventStats>,
  dailyStatsMap: Record<string, SkillEventDailyStats[]> = {},
  limit = 48
): GrowthRankedSkill[] {
  return skills
    .map((skill) => {
      const stats = eventStatsMap[skill.slug]
      const daily = summarizeSkillDailyStats(dailyStatsMap[skill.slug])
      const quality = getSkillQualityProfile(skill)
      const hasRecentActivity = daily.total_events > 0
      const eventRecency = daily.latest_event_at ? dateScore(daily.latest_event_at, 7) : eventRecencyScore(stats)
      const pushRecency = dateScore(skill.github_last_pushed_at || skill.updated_at, 45)
      const launchRecency = dateScore(skill.created_at, 21)
      const aggregateActionScore =
        (stats?.install_copies || 0) * 12 +
        (stats?.outbound_clicks || 0) * 8 +
        (stats?.compares || 0) * 6 +
        (stats?.views || 0) * 1.5
      const recentActionScore = daily.weighted_engagement * 1.35 + daily.install_copies * 8 + daily.outbound_clicks * 5
      const actionScore = hasRecentActivity ? recentActionScore : aggregateActionScore
      const score =
        actionScore +
        eventRecency * 35 +
        pushRecency * 22 +
        launchRecency * 18 +
        quality.score * 0.18 +
        Math.log10(Math.max(1, skill.github_stars || 1)) * 4
      const freshnessLabel = hasRecentActivity
        ? 'Active this week'
        : pushRecency > 0.7
          ? 'Fresh repo'
          : eventRecency > 0.5
            ? 'Active page'
            : 'Hot candidate'
      return {
        skill,
        score,
        badge: hasRecentActivity ? `${daily.total_events} recent events` : freshnessLabel,
        reason: hasRecentActivity
          ? `${freshnessLabel} with ${daily.install_copies} install copies, ${daily.outbound_clicks} outbound clicks, and ${quality.label.toLowerCase()} quality.`
          : `${freshnessLabel} with ${quality.label.toLowerCase()} quality and current OpenAgentSkill activity signals.`,
      }
    })
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}
