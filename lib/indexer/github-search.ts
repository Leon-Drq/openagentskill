/**
 * GitHub Search Module for Skill Auto-Indexer
 *
 * Uses GitHub Code Search API to find repositories containing SKILL.md,
 * which signals they are designed to be Open Agent Skills.
 */

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
  updatedAt: string
  htmlUrl: string
}

/**
 * Search strategy matrix — each entry targets a distinct category of agent skills.
 *
 * Two axes:
 *  - "skill collections" (awesome-lists / curated skill packs): high value, many skills per repo
 *  - "single skill repos" (focused MCP tool / agent plugin): broad long-tail discovery
 *
 * Ordered by expected signal quality. Rotated round-robin across cron runs so
 * every query gets fresh results over time without hitting rate limits.
 */
const SEARCH_QUERIES: Array<{ q: string; sort: 'stars' | 'updated' }> = [
  // ── Skill collections ──────────────────────────────────────────────────────
  { q: 'topic:agent-skills',               sort: 'stars'   },
  { q: 'topic:openclaw-skills',            sort: 'stars'   },
  { q: 'topic:clawdbot-skill',             sort: 'stars'   },
  { q: 'topic:mcp-skills',                 sort: 'stars'   },
  { q: '"awesome" "agent skills"',         sort: 'stars'   },
  { q: '"awesome" "mcp servers"',          sort: 'stars'   },
  { q: 'filename:SKILL.md',                sort: 'stars'   },

  // ── Single MCP tool / plugin repos ────────────────────────────────────────
  { q: 'topic:mcp-tool stars:>10',         sort: 'stars'   },
  { q: 'topic:mcp-plugin stars:>5',        sort: 'stars'   },
  { q: 'topic:claude-tool stars:>5',       sort: 'stars'   },
  { q: 'topic:openai-plugin stars:>10',    sort: 'stars'   },
  { q: 'topic:langchain-tool stars:>10',   sort: 'stars'   },
  { q: 'topic:crewai stars:>10',           sort: 'stars'   },
  { q: 'topic:autogen stars:>10',          sort: 'stars'   },
  { q: '"mcp server" stars:>20 -topic:n8n',sort: 'stars'   },
  { q: 'topic:voltagent-skill',            sort: 'stars'   },
  { q: 'topic:ai-skill',                   sort: 'stars'   },
  { q: '"agent tool" stars:>10',           sort: 'updated' },
  { q: '"agent plugin" stars:>10',         sort: 'updated' },
  { q: 'topic:browser-use',               sort: 'stars'   },
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
    .filter((r) => r.stargazers_count >= 3)          // minimum quality bar
    .map((r) => ({
      owner:       r.owner.login,
      repo:        r.name,
      fullName:    r.full_name,
      description: r.description || '',
      stars:       r.stargazers_count ?? 0,
      language:    r.language ?? null,
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
