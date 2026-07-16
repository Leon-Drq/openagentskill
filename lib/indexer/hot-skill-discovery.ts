import { evaluateSkillCandidate } from './skill-filter'
import type { CandidateRepo } from './github-search'

type GitHubSearchSort = 'stars' | 'updated'

interface HotSkillQuery {
  q: string
  sort: GitHubSearchSort
}

interface GitHubRepoItem {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
  updated_at: string
  pushed_at: string | null
  archived: boolean
  fork: boolean
  topics?: string[]
  owner: {
    login: string
  }
}

interface GitHubSearchResponse {
  items?: GitHubRepoItem[]
}

export interface HotSkillDiscoveryOptions {
  limit?: number
  minStars?: number
  lookbackDays?: number
  perPage?: number
  maxQueries?: number
  queryOffset?: number
}

export interface HotSkillDiscoveryResult {
  candidates: CandidateRepo[]
  searchedQueries: number
  queryOffset: number
  minStars: number
  lookbackDays: number
  since: string
}

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_SEARCH_TIMEOUT_MS = 10_000
const GITHUB_SEARCH_RETRY_DELAYS_MS = [750, 1_750]

const HOT_SKILL_QUERIES: HotSkillQuery[] = [
  { q: '"agent skill"', sort: 'updated' },
  { q: '"AI agent skill"', sort: 'updated' },
  { q: '"Codex skill"', sort: 'updated' },
  { q: '"Claude Code" "skill"', sort: 'updated' },
  { q: '"ppt" "agent skill"', sort: 'updated' },
  { q: '"pptx" "Claude Code" "skill"', sort: 'updated' },
  { q: '"presentation" "agent skill"', sort: 'updated' },
  { q: '"slide deck" "agent"', sort: 'updated' },
  { q: '"Cursor" "agent skill"', sort: 'updated' },
  { q: 'topic:agent-skills', sort: 'updated' },
  { q: 'topic:ai-agent', sort: 'updated' },
  { q: 'topic:llm-agent', sort: 'updated' },
  { q: 'topic:web-scraping', sort: 'updated' },
  { q: 'topic:rag', sort: 'updated' },
  { q: 'topic:document-ai', sort: 'updated' },
  { q: 'topic:quantitative-finance', sort: 'updated' },
  { q: 'topic:algorithmic-trading', sort: 'updated' },
  { q: 'topic:seo', sort: 'updated' },
  { q: 'topic:design-automation', sort: 'updated' },
  { q: 'topic:presentation', sort: 'updated' },
  { q: 'topic:football-analytics', sort: 'updated' },
  { q: 'topic:world-cup', sort: 'updated' },
]

function githubHeaders() {
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'OpenAgentSkill-Radar/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  }
}

function isoDateDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 86_400_000)
  return date.toISOString().slice(0, 10)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function rotatedWindow<T>(items: readonly T[], count: number, offset: number) {
  if (!items.length || count <= 0) return []

  const start = ((offset % items.length) + items.length) % items.length
  const size = Math.min(count, items.length)
  return Array.from({ length: size }, (_, index) => items[(start + index) % items.length])
}

function scoreHotRepo(repo: GitHubRepoItem) {
  const pushedAt = Date.parse(repo.pushed_at || repo.updated_at)
  const ageDays = Number.isFinite(pushedAt)
    ? Math.max(0, (Date.now() - pushedAt) / 86_400_000)
    : 365
  const freshness = Math.max(0, 40 - ageDays)
  const stars = Math.log10(Math.max(1, repo.stargazers_count) + 10) * 18
  const topicBoost = (repo.topics || []).some((topic) => /skill|agent|codex|claude|cursor/i.test(topic))
    ? 14
    : 0

  return freshness + stars + topicBoost
}

function toCandidate(repo: GitHubRepoItem): CandidateRepo {
  return {
    owner: repo.owner.login,
    repo: repo.name,
    fullName: repo.full_name,
    description: repo.description || '',
    stars: repo.stargazers_count ?? 0,
    language: repo.language ?? null,
    topics: repo.topics || [],
    updatedAt: repo.updated_at,
    htmlUrl: repo.html_url,
  }
}

async function searchHotQuery(query: HotSkillQuery, options: {
  minStars: number
  since: string
  perPage: number
  page: number
}) {
  const q = `${query.q} stars:>=${options.minStars} pushed:>=${options.since} archived:false fork:false`
  const url =
    `${GITHUB_API_BASE}/search/repositories` +
    `?q=${encodeURIComponent(q)}` +
    `&sort=${query.sort}&order=desc&per_page=${options.perPage}&page=${options.page}`

  for (let attempt = 0; attempt <= GITHUB_SEARCH_RETRY_DELAYS_MS.length; attempt += 1) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: githubHeaders(),
        signal: AbortSignal.timeout(GITHUB_SEARCH_TIMEOUT_MS),
      })
    } catch (error) {
      if (attempt === GITHUB_SEARCH_RETRY_DELAYS_MS.length) throw error
      await sleep(GITHUB_SEARCH_RETRY_DELAYS_MS[attempt])
      continue
    }

    if (response.ok) {
      const data = (await response.json()) as GitHubSearchResponse
      return (data.items || []).filter((repo) => !repo.archived && !repo.fork)
    }

    const retryable = [429, 502, 503, 504].includes(response.status)
    const body = await response.text().catch(() => '')
    const detail = body.replace(/\s+/g, ' ').slice(0, 180)
    if (!retryable || attempt === GITHUB_SEARCH_RETRY_DELAYS_MS.length) {
      throw new Error(`GitHub hot search failed [${q}]: ${response.status} ${detail}`)
    }

    const retryAfterSeconds = Number(response.headers.get('retry-after'))
    const fallbackDelay = GITHUB_SEARCH_RETRY_DELAYS_MS[attempt]
    const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1_000, 10_000)
      : fallbackDelay
    await sleep(retryDelay)
  }

  return []
}

export async function searchHotSkillRepos(
  options: HotSkillDiscoveryOptions = {}
): Promise<HotSkillDiscoveryResult> {
  const limit = Math.min(Math.max(options.limit || 24, 1), 80)
  const minStars = Math.max(Math.floor(options.minStars || 10), 10)
  const lookbackDays = Math.min(Math.max(Math.floor(options.lookbackDays || 21), 1), 90)
  const perPage = Math.min(Math.max(options.perPage || 12, 5), 30)
  const maxQueries = Math.min(Math.max(options.maxQueries || 12, 1), HOT_SKILL_QUERIES.length)
  const queryOffset = Math.max(0, Math.floor(options.queryOffset ?? 0))
  const since = isoDateDaysAgo(lookbackDays)
  const seen = new Set<string>()
  const repos: GitHubRepoItem[] = []
  let searchedQueries = 0

  for (const query of rotatedWindow(HOT_SKILL_QUERIES, maxQueries, queryOffset)) {
    if (repos.length >= limit * 3) break
    searchedQueries += 1

    // Repeating the first GitHub result page eventually only returns skills we
    // already know. Rotate through a small, recent result window so hourly
    // runs keep discovering fresh candidates without increasing API traffic.
    const page = 1 + ((queryOffset + searchedQueries - 1) % 3)

    try {
      const items = await searchHotQuery(query, { minStars, since, perPage, page })
      for (const repo of items) {
        if (seen.has(repo.full_name)) continue
        const evaluation = evaluateSkillCandidate({
          fullName: repo.full_name,
          name: repo.name,
          description: repo.description,
          topics: repo.topics || [],
          language: repo.language,
          query: query.q,
          stars: repo.stargazers_count,
        })
        if (!evaluation.accepted) continue
        seen.add(repo.full_name)
        repos.push(repo)
      }
    } catch (error) {
      console.warn('[hot-skill-discovery] query skipped:', error)
    }

    if (searchedQueries < maxQueries) await sleep(process.env.GITHUB_TOKEN ? 500 : 1200)
  }

  const candidates = repos
    .sort((a, b) => scoreHotRepo(b) - scoreHotRepo(a))
    .slice(0, limit)
    .map(toCandidate)

  return {
    candidates,
    searchedQueries,
    queryOffset,
    minStars,
    lookbackDays,
    since,
  }
}
