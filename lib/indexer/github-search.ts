/**
 * GitHub Search Module for Skill Auto-Indexer
 *
 * Uses GitHub Code Search API to find repositories containing SKILL.md,
 * which signals they are designed to be Open Agent Skills.
 */

import { evaluateSkillCandidate } from './skill-filter'

const GITHUB_API_BASE = 'https://api.github.com'

function githubHeaders() {
  return {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  }
}

export interface CandidateRepo {
  owner: string
  repo: string
  fullName: string
  description: string
  stars: number
  language: string | null
  topics?: string[]
  updatedAt: string
  htmlUrl: string
}

/**
 * Search strategy matrix — each entry targets a distinct category of agent skills.
 *
 * Two axes:
 *  - "skill-native" repos with explicit agent skill signals
 *  - "single skill repos" focused on agent tools, automation, and plugin workflows
 *
 * Ordered by expected signal quality. Rotated round-robin across cron runs so
 * every query gets fresh results over time without hitting rate limits.
 */
const SEARCH_QUERIES: Array<{ q: string; sort: 'stars' | 'updated' }> = [
  // ── Skill-native repos ─────────────────────────────────────────────────────
  { q: 'topic:agent-skills stars:>50',     sort: 'stars'   },
  { q: '"agent skill" stars:>50',          sort: 'updated' },
  { q: '"Codex skill" stars:>50',          sort: 'updated' },
  { q: '"Claude Code" "skill" stars:>50',  sort: 'updated' },
  { q: '"Cursor rules" "agent" stars:>50', sort: 'updated' },
  { q: 'topic:ai-agents stars:>1000',      sort: 'stars'   },
  { q: 'topic:llm-agent stars:>1000',      sort: 'stars'   },
  { q: '"agent framework" stars:>1000',    sort: 'stars'   },

  // ── Popular agent tools ────────────────────────────────────────────────────
  { q: 'topic:claude-tool stars:>50',      sort: 'stars'   },
  { q: 'topic:openai-plugin stars:>50',    sort: 'stars'   },
  { q: 'topic:langchain-tool stars:>50',   sort: 'stars'   },
  { q: 'topic:ai-agent stars:>100',        sort: 'stars'   },
  { q: 'topic:llm-tool stars:>50',         sort: 'stars'   },

  // ── Frameworks & ecosystems ────────────────────────────────────────────────
  { q: 'topic:crewai stars:>50',           sort: 'stars'   },
  { q: 'topic:autogen stars:>50',          sort: 'stars'   },
  { q: 'topic:browser-use stars:>50',      sort: 'stars'   },
  { q: 'topic:browser-automation stars:>1000', sort: 'stars' },
  { q: 'topic:web-scraping stars:>5000',   sort: 'stars'   },
  { q: 'topic:rag stars:>5000',            sort: 'stars'   },
  { q: '"ai tool" stars:>100',             sort: 'updated' },

  // ── Domain capabilities that agents can install or call as reusable skills ─
  { q: 'topic:quantitative-finance stars:>500', sort: 'stars' },
  { q: 'topic:algorithmic-trading stars:>500',  sort: 'stars' },
  { q: 'topic:backtesting stars:>500',          sort: 'stars' },
  { q: '"SEC filings" stars:>500',              sort: 'stars' },
  { q: 'topic:business-intelligence stars:>500', sort: 'stars' },
  { q: 'topic:etl stars:>500',                  sort: 'stars' },
  { q: 'topic:document-ai stars:>500',          sort: 'stars' },
  { q: 'topic:vulnerability-scanner stars:>500', sort: 'stars' },
  { q: 'topic:observability stars:>500',        sort: 'stars' },
  { q: 'topic:geospatial stars:>500',           sort: 'stars' },
]

/**
 * Search GitHub for agent skill repositories.
 * Rotates across the query matrix so each cron run covers a different slice.
 */
export async function searchSkillRepos(
  page = 1,
  perPage = 20
): Promise<CandidateRepo[]> {
  const idx = (page - 1) % SEARCH_QUERIES.length
  const { q, sort } = SEARCH_QUERIES[idx]
  const ghPage = Math.ceil(page / SEARCH_QUERIES.length)

  const url =
    `${GITHUB_API_BASE}/search/repositories` +
    `?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=${perPage}&page=${ghPage}`

  const response = await fetch(url, { headers: githubHeaders() } as RequestInit)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub search failed [${q}]: ${response.status} ${body}`)
  }

  const data = await response.json()
  if (!data.items?.length) return []

  return (data.items as any[])
    .filter((r) => !r.archived && !r.fork)          // skip archived and forks
    .filter((r) => r.stargazers_count >= 50)         // minimum quality bar: 50+ stars
    .filter((r) =>
      evaluateSkillCandidate({
        fullName: r.full_name,
        name: r.name,
        description: r.description,
        topics: r.topics || [],
        language: r.language,
        query: q,
      }).accepted
    )
    .map((r) => ({
      owner:       r.owner.login,
      repo:        r.name,
      fullName:    r.full_name,
      description: r.description || '',
      stars:       r.stargazers_count ?? 0,
      language:    r.language ?? null,
      topics:      r.topics || [],
      updatedAt:   r.updated_at,
      htmlUrl:     r.html_url,
    }))
}

/**
 * Filter out repositories that are already in the database.
 */
export async function filterNewRepos(
  candidates: CandidateRepo[],
  existingSlugs: Set<string>
): Promise<CandidateRepo[]> {
  return candidates.filter((c) => {
    const slug = `${c.owner}-${c.repo}`.toLowerCase()
    return !existingSlugs.has(slug)
  })
}

/**
 * Fetch all current slugs from the database to avoid re-processing.
 */
export async function fetchExistingSlugs(): Promise<Set<string>> {
  const { createPublicClient } = await import('@/lib/supabase/public')
  const supabase = createPublicClient()

  const { data, error } = await supabase.from('skills').select('slug')
  if (error) throw new Error(`Failed to fetch existing slugs: ${error.message}`)

  return new Set((data || []).map((r: { slug: string }) => r.slug))
}
