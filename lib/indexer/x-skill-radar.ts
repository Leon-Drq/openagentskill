import { isGenericFoundationRepoName } from '@/lib/x/candidates'
import { evaluateSkillCandidate } from './skill-filter'
import type { CandidateRepo } from './github-search'

interface XUrlEntity {
  url?: string
  expanded_url?: string
  unwound_url?: string
  display_url?: string
}

interface XRecentTweet {
  id: string
  text: string
  author_id?: string
  created_at?: string
  lang?: string
  entities?: {
    urls?: XUrlEntity[]
  }
  public_metrics?: {
    retweet_count?: number
    reply_count?: number
    like_count?: number
    quote_count?: number
    bookmark_count?: number
    impression_count?: number
  }
}

interface XRecentSearchResponse {
  data?: XRecentTweet[]
  meta?: {
    result_count?: number
  }
  errors?: Array<{ title?: string; detail?: string; message?: string }>
}

interface GitHubRepoResponse {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
  pushed_at: string | null
  updated_at: string | null
  archived: boolean
  fork: boolean
  topics?: string[]
  owner: {
    login: string
  }
}

export interface XSkillRadarCandidate extends CandidateRepo {
  xSignal: {
    tweetId: string
    authorId?: string
    createdAt?: string
    text: string
    query: string
    engagementScore: number
    metrics: NonNullable<XRecentTweet['public_metrics']>
  }
  radarScore: number
}

export interface XSkillRadarOptions {
  limit?: number
  minStars?: number
  maxQueries?: number
  maxResultsPerQuery?: number
}

export interface XSkillRadarResult {
  status: 'ready' | 'skipped'
  reason?: string
  candidates: XSkillRadarCandidate[]
  searchedQueries: number
  inspectedTweets: number
  extractedRepos: number
  minStars: number
}

const X_RECENT_SEARCH_URL = 'https://api.x.com/2/tweets/search/recent'
const GITHUB_API_BASE = 'https://api.github.com'

const X_SKILL_RADAR_QUERIES = [
  '("agent skill" OR "AI agent skill" OR "Codex skill" OR "Claude Code skill" OR "Cursor skill") (github.com OR "GitHub") has:links -is:retweet',
  '("skill" "Claude Code" OR "skill" "Codex" OR "skill" "Cursor") (github.com OR "GitHub") has:links -is:retweet',
  '("PPT skill" OR "pptx skill" OR "presentation skill" OR "slide deck skill") (github.com OR "GitHub") has:links -is:retweet',
  '("stock analysis skill" OR "trading skill" OR "quant skill" OR "finance agent skill") (github.com OR "GitHub") has:links -is:retweet',
  '("research skill" OR "last30days-skill" OR "deep research skill") (github.com OR "GitHub") has:links -is:retweet',
  '("web scraping skill" OR "browser automation skill" OR "crawler skill") (github.com OR "GitHub") has:links -is:retweet',
  '("World Cup" "skill" OR "football analytics" "skill" OR "sports analytics" "agent") (github.com OR "GitHub") has:links -is:retweet',
  '("design skill" OR "video skill" OR "creative agent skill") (github.com OR "GitHub") has:links -is:retweet',
]

const WORKFLOW_SIGNAL = /\b(agent[-_\s]?skill|skill\.md|skills?|codex|claude code|cursor|gemini cli|agent workflow|installable|workflow|automation|ppt|pptx|powerpoint|slides?|presentation|deck|stock|trading|finance|quant|backtest|research|last30|web scraping|crawler|browser automation|rag|pdf|document|seo|design|video|world cup|football|soccer|sports analytics)\b/i

function xBearerToken() {
  return (
    process.env.X_BEARER_TOKEN ||
    process.env.X_API_BEARER_TOKEN ||
    process.env.TWITTER_BEARER_TOKEN ||
    process.env.X_API_TOKEN ||
    ''
  ).trim()
}

function githubHeaders() {
  return {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  }
}

function normalizeGithubUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^github\.com\//i.test(trimmed)) return `https://${trimmed}`
  if (/^www\.github\.com\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

export function parseGitHubRepoFromUrl(raw: string) {
  const normalized = normalizeGithubUrl(raw)
  const match = normalized.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
  if (!match) return null

  const owner = match[1]
  const repo = match[2].replace(/\.git$/i, '')
  if (!owner || !repo) return null
  if (['topics', 'features', 'marketplace', 'orgs', 'collections'].includes(owner.toLowerCase())) return null
  if (['issues', 'pull', 'pulls', 'tree', 'blob', 'discussions', 'releases'].includes(repo.toLowerCase())) return null

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  }
}

function extractGitHubRepos(tweet: XRecentTweet) {
  const urls = new Set<string>()
  const textUrls = tweet.text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/gi) || []
  for (const url of textUrls) urls.add(url)

  for (const entity of tweet.entities?.urls || []) {
    for (const value of [entity.unwound_url, entity.expanded_url, entity.display_url, entity.url]) {
      if (!value) continue
      if (/github\.com\//i.test(value)) urls.add(value)
    }
  }

  return Array.from(urls)
    .map(parseGitHubRepoFromUrl)
    .filter((repo): repo is { owner: string; repo: string; fullName: string } => Boolean(repo))
}

function engagementScore(tweet: XRecentTweet) {
  const metrics = tweet.public_metrics || {}
  return (
    Math.log10((metrics.like_count || 0) + 1) * 12 +
    Math.log10((metrics.retweet_count || 0) + 1) * 14 +
    Math.log10((metrics.reply_count || 0) + 1) * 8 +
    Math.log10((metrics.quote_count || 0) + 1) * 10 +
    Math.log10((metrics.bookmark_count || 0) + 1) * 10 +
    Math.log10((metrics.impression_count || 0) + 1) * 3
  )
}

function radarScore(repo: GitHubRepoResponse, tweet: XRecentTweet, relevanceScore: number) {
  const pushedAt = Date.parse(repo.pushed_at || repo.updated_at || '')
  const ageDays = Number.isFinite(pushedAt) ? Math.max(0, (Date.now() - pushedAt) / 86_400_000) : 365
  const freshness = Math.max(0, 28 - ageDays / 2)
  const stars = Math.log10(Math.max(0, repo.stargazers_count) + 10) * 18
  return Math.round((engagementScore(tweet) + stars + freshness + relevanceScore * 12) * 10) / 10
}

async function searchXRecent(query: string, maxResults: number, token: string) {
  const url = new URL(X_RECENT_SEARCH_URL)
  url.searchParams.set('query', query)
  url.searchParams.set('max_results', String(Math.min(Math.max(maxResults, 10), 100)))
  url.searchParams.set('tweet.fields', 'author_id,created_at,entities,lang,public_metrics')
  url.searchParams.set('expansions', 'author_id')

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`X recent search failed: ${response.status} ${body}`)
  }

  return (await response.json()) as XRecentSearchResponse
}

async function fetchGitHubRepo(owner: string, repo: string) {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: githubHeaders(),
  } as RequestInit)

  if (!response.ok) return null
  return (await response.json()) as GitHubRepoResponse
}

function toCandidate(repo: GitHubRepoResponse, tweet: XRecentTweet, query: string, score: number): XSkillRadarCandidate {
  return {
    owner: repo.owner.login,
    repo: repo.name,
    fullName: repo.full_name,
    description: repo.description || '',
    stars: repo.stargazers_count ?? 0,
    language: repo.language ?? null,
    topics: repo.topics || [],
    updatedAt: repo.updated_at || repo.pushed_at || new Date().toISOString(),
    htmlUrl: repo.html_url,
    xSignal: {
      tweetId: tweet.id,
      authorId: tweet.author_id,
      createdAt: tweet.created_at,
      text: tweet.text,
      query,
      engagementScore: engagementScore(tweet),
      metrics: tweet.public_metrics || {},
    },
    radarScore: score,
  }
}

export async function searchXSkillRadarRepos(options: XSkillRadarOptions = {}): Promise<XSkillRadarResult> {
  const token = xBearerToken()
  const minStars = Math.max(Math.floor(options.minStars || 10), 10)
  const limit = Math.min(Math.max(options.limit || 24, 1), 80)
  const maxQueries = Math.min(Math.max(options.maxQueries || 4, 1), X_SKILL_RADAR_QUERIES.length)
  const maxResultsPerQuery = Math.min(Math.max(options.maxResultsPerQuery || 20, 10), 100)

  if (!token) {
    return {
      status: 'skipped',
      reason: 'Missing X bearer token',
      candidates: [],
      searchedQueries: 0,
      inspectedTweets: 0,
      extractedRepos: 0,
      minStars,
    }
  }

  const candidates = new Map<string, XSkillRadarCandidate>()
  let inspectedTweets = 0
  let extractedRepos = 0
  let searchedQueries = 0

  for (const query of X_SKILL_RADAR_QUERIES.slice(0, maxQueries)) {
    searchedQueries += 1
    try {
      const response = await searchXRecent(query, maxResultsPerQuery, token)
      for (const tweet of response.data || []) {
        inspectedTweets += 1
        const repos = extractGitHubRepos(tweet)
        extractedRepos += repos.length

        for (const parsed of repos) {
          if (candidates.has(parsed.fullName.toLowerCase())) continue
          if (isGenericFoundationRepoName(parsed.fullName)) continue

          const repo = await fetchGitHubRepo(parsed.owner, parsed.repo)
          if (!repo || repo.archived || repo.fork || repo.stargazers_count < minStars) continue

          const sourceText = `${tweet.text} ${repo.full_name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`
          if (!WORKFLOW_SIGNAL.test(sourceText)) continue

          const evaluation = evaluateSkillCandidate({
            fullName: repo.full_name,
            name: repo.name,
            description: repo.description,
            topics: repo.topics || [],
            language: repo.language,
            query: `${query} ${tweet.text}`,
            stars: repo.stargazers_count,
          })
          if (!evaluation.accepted) continue

          const score = radarScore(repo, tweet, evaluation.score)
          candidates.set(repo.full_name.toLowerCase(), toCandidate(repo, tweet, query, score))
          if (candidates.size >= limit * 2) break
        }

        if (candidates.size >= limit * 2) break
      }
    } catch (error) {
      console.warn('[x-skill-radar] query skipped:', error)
    }

    if (candidates.size >= limit * 2) break
  }

  const sortedCandidates = Array.from(candidates.values())
    .sort((a, b) => b.radarScore - a.radarScore)
    .slice(0, limit)

  return {
    status: sortedCandidates.length ? 'ready' : 'skipped',
    reason: sortedCandidates.length ? undefined : 'No X-linked skill repositories passed quality gates',
    candidates: sortedCandidates,
    searchedQueries,
    inspectedTweets,
    extractedRepos,
    minStars,
  }
}
