import { createClient } from '@supabase/supabase-js'

type CuratedSkillRepo = {
  repo: string
  category: string
  tags: string[]
  frameworks: string[]
  name?: string
  tagline?: string
}

type GitHubRepo = {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  pushed_at: string | null
  language: string | null
  license: { spdx_id: string | null } | null
  owner: { login: string; html_url: string }
}

const curatedRepos: CuratedSkillRepo[] = [
  {
    repo: 'Significant-Gravitas/AutoGPT',
    category: 'agent-frameworks',
    tags: ['autonomous-agent', 'workflow', 'python'],
    frameworks: ['AutoGPT', 'Python', 'LLM'],
    tagline: 'Build and run autonomous AI agents for open-ended tasks',
  },
  {
    repo: 'n8n-io/n8n',
    category: 'automation',
    tags: ['workflow', 'integrations', 'automation'],
    frameworks: ['MCP', 'Node.js', 'AI Agents'],
    tagline: 'Connect agents to hundreds of workflow automations',
  },
  {
    repo: 'langchain-ai/langchain',
    category: 'agent-frameworks',
    tags: ['agents', 'rag', 'tools'],
    frameworks: ['LangChain', 'Python', 'JavaScript'],
    tagline: 'Agent engineering primitives for tools, memory, and RAG',
  },
  {
    repo: 'microsoft/markitdown',
    category: 'data',
    tags: ['documents', 'markdown', 'rag'],
    frameworks: ['Python', 'RAG', 'LLM'],
    tagline: 'Convert documents into Markdown for agent-readable context',
  },
  {
    repo: 'google-gemini/gemini-cli',
    category: 'development',
    tags: ['coding-agent', 'cli', 'gemini'],
    frameworks: ['Gemini', 'CLI', 'TypeScript'],
    tagline: 'Bring a coding agent directly into the terminal',
  },
  {
    repo: 'infiniflow/ragflow',
    category: 'data',
    tags: ['rag', 'documents', 'retrieval'],
    frameworks: ['RAG', 'Python', 'LLM'],
    tagline: 'Build document intelligence and RAG workflows for agents',
  },
  {
    repo: 'FoundationAgents/MetaGPT',
    category: 'agent-frameworks',
    tags: ['multi-agent', 'software-company', 'planning'],
    frameworks: ['MetaGPT', 'Python', 'Multi-Agent'],
    tagline: 'Coordinate multi-agent teams for software and product work',
  },
  {
    repo: 'scrapy/scrapy',
    category: 'web-automation',
    tags: ['crawler', 'scraping', 'data-extraction'],
    frameworks: ['Python', 'Crawler', 'RAG'],
    tagline: 'High-throughput crawling and scraping for agent data pipelines',
  },
  {
    repo: 'microsoft/autogen',
    category: 'agent-frameworks',
    tags: ['multi-agent', 'orchestration', 'python'],
    frameworks: ['AutoGen', 'Python', 'LLM'],
    tagline: 'Program multi-agent conversations and tool-using workflows',
  },
  {
    repo: 'FlowiseAI/Flowise',
    category: 'automation',
    tags: ['visual-builder', 'agents', 'rag'],
    frameworks: ['LangChain', 'TypeScript', 'RAG'],
    tagline: 'Visually compose agent and RAG workflows',
  },
  {
    repo: 'crewAIInc/crewAI',
    category: 'agent-frameworks',
    tags: ['multi-agent', 'roles', 'workflow'],
    frameworks: ['CrewAI', 'Python', 'LLM'],
    tagline: 'Orchestrate role-based AI agent teams',
  },
  {
    repo: 'run-llama/llama_index',
    category: 'data',
    tags: ['rag', 'data-agents', 'retrieval'],
    frameworks: ['LlamaIndex', 'Python', 'RAG'],
    tagline: 'Connect agents to private data and retrieval workflows',
  },
  {
    repo: 'D4Vinci/Scrapling',
    category: 'web-automation',
    tags: ['scraping', 'crawler', 'browser'],
    frameworks: ['Python', 'Web Automation', 'RAG'],
    tagline: 'Adaptive web scraping for agent data collection',
  },
  {
    repo: 'ChromeDevTools/chrome-devtools-mcp',
    category: 'mcp-servers',
    tags: ['mcp', 'browser', 'debugging'],
    frameworks: ['MCP', 'Chrome', 'Codex'],
    tagline: 'Expose Chrome DevTools to coding agents through MCP',
  },
  {
    repo: 'bytedance/UI-TARS-desktop',
    category: 'automation',
    tags: ['desktop-agent', 'multimodal', 'computer-use'],
    frameworks: ['UI-TARS', 'Desktop', 'TypeScript'],
    tagline: 'Run multimodal agents that operate desktop interfaces',
  },
  {
    repo: 'OpenBMB/ChatDev',
    category: 'development',
    tags: ['multi-agent', 'software-dev', 'planning'],
    frameworks: ['Python', 'Multi-Agent', 'LLM'],
    tagline: 'Use multi-agent collaboration for software development',
  },
  {
    repo: 'langchain-ai/langgraph',
    category: 'agent-frameworks',
    tags: ['graph', 'agents', 'state-machine'],
    frameworks: ['LangGraph', 'Python', 'LangChain'],
    tagline: 'Build resilient stateful agents with graph workflows',
  },
  {
    repo: 'punkpeye/awesome-mcp-servers',
    category: 'mcp-servers',
    tags: ['mcp', 'directory', 'tools'],
    frameworks: ['MCP', 'Claude', 'Codex'],
    tagline: 'Discover a large catalog of MCP servers for agents',
  },
  {
    repo: 'microsoft/playwright-mcp',
    category: 'mcp-servers',
    tags: ['mcp', 'browser', 'testing'],
    frameworks: ['MCP', 'Playwright', 'Browser'],
    tagline: 'Give agents browser automation through Playwright MCP',
  },
  {
    repo: 'github/github-mcp-server',
    category: 'mcp-servers',
    tags: ['mcp', 'github', 'developer-tools'],
    frameworks: ['MCP', 'GitHub', 'Codex'],
    tagline: 'Let agents inspect and automate GitHub through MCP',
  },
  {
    repo: 'assafelovic/gpt-researcher',
    category: 'research',
    tags: ['research', 'reports', 'agents'],
    frameworks: ['Python', 'Research Agent', 'LLM'],
    tagline: 'Run autonomous deep research over web and local sources',
  },
  {
    repo: 'PrefectHQ/fastmcp',
    category: 'mcp-servers',
    tags: ['mcp', 'sdk', 'python'],
    frameworks: ['MCP', 'Python', 'Server'],
    tagline: 'Build MCP servers and clients quickly in Python',
  },
  {
    repo: 'ScrapeGraphAI/Scrapegraph-ai',
    category: 'web-automation',
    tags: ['scraping', 'llm', 'graphs'],
    frameworks: ['Python', 'LLM', 'Web Automation'],
    tagline: 'Extract web data with LLM-guided scraping graphs',
  },
  {
    repo: 'modelcontextprotocol/python-sdk',
    category: 'mcp-servers',
    tags: ['mcp', 'sdk', 'python'],
    frameworks: ['MCP', 'Python', 'Claude'],
    tagline: 'Official Python SDK for MCP servers and clients',
  },
  {
    repo: 'activepieces/activepieces',
    category: 'integrations',
    tags: ['automation', 'integrations', 'mcp'],
    frameworks: ['MCP', 'TypeScript', 'Workflow'],
    tagline: 'Connect agents to workflow automations and app integrations',
  },
  {
    repo: 'Skyvern-AI/skyvern',
    category: 'web-automation',
    tags: ['browser', 'automation', 'agents'],
    frameworks: ['Python', 'Browser', 'LLM'],
    tagline: 'Automate browser workflows with AI agents',
  },
  {
    repo: 'browserbase/stagehand',
    category: 'web-automation',
    tags: ['browser', 'sdk', 'automation'],
    frameworks: ['TypeScript', 'Browserbase', 'Playwright'],
    tagline: 'Build browser agents with natural language actions',
  },
  {
    repo: 'googleapis/mcp-toolbox',
    category: 'mcp-servers',
    tags: ['mcp', 'database', 'tools'],
    frameworks: ['MCP', 'Go', 'Database'],
    tagline: 'Expose databases to agents through an MCP toolbox',
  },
  {
    repo: 'GLips/Figma-Context-MCP',
    category: 'design',
    tags: ['mcp', 'figma', 'design'],
    frameworks: ['MCP', 'Figma', 'Cursor'],
    tagline: 'Provide Figma layout context to coding agents',
  },
  {
    repo: 'pydantic/pydantic-ai',
    category: 'agent-frameworks',
    tags: ['agents', 'typed', 'python'],
    frameworks: ['PydanticAI', 'Python', 'LLM'],
    tagline: 'Build typed AI agents with Pydantic patterns',
  },
  {
    repo: 'camel-ai/camel',
    category: 'agent-frameworks',
    tags: ['multi-agent', 'societies', 'python'],
    frameworks: ['CAMEL', 'Python', 'Multi-Agent'],
    tagline: 'Research-grade multi-agent framework and environments',
  },
  {
    repo: 'QwenLM/Qwen-Agent',
    category: 'agent-frameworks',
    tags: ['qwen', 'function-calling', 'rag'],
    frameworks: ['Qwen', 'Python', 'MCP'],
    tagline: 'Build Qwen-powered agents with tools, RAG, and MCP',
  },
  {
    repo: 'GreyDGL/PentestGPT',
    category: 'security',
    tags: ['security', 'pentest', 'agent'],
    frameworks: ['Python', 'Security', 'LLM'],
    tagline: 'Assist penetration testing workflows with agentic reasoning',
  },
  {
    repo: 'simular-ai/Agent-S',
    category: 'automation',
    tags: ['computer-use', 'desktop', 'agent'],
    frameworks: ['Python', 'Computer Use', 'LLM'],
    tagline: 'Use computers through an open agentic framework',
  },
  {
    repo: 'microsoft/semantic-kernel',
    category: 'agent-frameworks',
    tags: ['agents', 'orchestration', 'enterprise'],
    frameworks: ['Semantic Kernel', 'C#', 'Python'],
    tagline: 'Compose enterprise LLM agents and plugins',
  },
  {
    repo: 'e2b-dev/E2B',
    category: 'development',
    tags: ['sandbox', 'code-execution', 'agents'],
    frameworks: ['Python', 'Sandbox', 'Code Interpreter'],
    tagline: 'Run agent code safely in cloud sandboxes',
  },
  {
    repo: 'apify/crawlee',
    category: 'web-automation',
    tags: ['crawler', 'browser', 'scraping'],
    frameworks: ['TypeScript', 'Playwright', 'Puppeteer'],
    tagline: 'Build reliable crawlers for LLM and RAG data ingestion',
  },
  {
    repo: 'dgtlmoon/changedetection.io',
    category: 'web-automation',
    tags: ['monitoring', 'web', 'alerts'],
    frameworks: ['Python', 'Web Monitoring', 'Automation'],
    tagline: 'Monitor web changes and trigger agent workflows',
  },
  {
    repo: 'AutomaApp/automa',
    category: 'automation',
    tags: ['browser', 'workflow', 'no-code'],
    frameworks: ['Browser Extension', 'Workflow', 'Automation'],
    tagline: 'Automate browser workflows with visual blocks',
  },
  {
    repo: 'aaron-he-zhu/aaron-marketing-skills',
    name: 'Aaron Marketing Skills',
    category: 'growth-marketing',
    tags: [
      'marketing',
      'seo',
      'geo',
      'influencer-marketing',
      'paid-ads',
      'email-marketing',
      'product-launch',
      'organic-social',
      'brand-narrative',
      'agent-skills',
    ],
    frameworks: ['Claude Code', 'Codex', 'Marketing Agents'],
    tagline:
      '120 marketing skills for SEO/GEO, influencer, ads, email, launch, social, and brand narrative workflows',
  },
  {
    repo: 'lightpanda-io/browser',
    category: 'web-automation',
    tags: ['browser', 'headless', 'automation'],
    frameworks: ['Zig', 'Browser', 'Automation'],
    tagline: 'Use a lightweight headless browser for agent automation',
  },
  {
    repo: 'getmaxun/maxun',
    category: 'web-automation',
    tags: ['scraping', 'no-code', 'apis'],
    frameworks: ['TypeScript', 'Crawler', 'RAG'],
    tagline: 'Turn websites into structured APIs for agents',
  },
  {
    repo: 'hangwin/mcp-chrome',
    category: 'mcp-servers',
    tags: ['mcp', 'chrome', 'browser'],
    frameworks: ['MCP', 'Chrome', 'Browser'],
    tagline: 'Connect Chrome browser capabilities to MCP clients',
  },
  {
    repo: 'alibaba/page-agent',
    category: 'web-automation',
    tags: ['browser', 'gui-agent', 'automation'],
    frameworks: ['TypeScript', 'Browser', 'LLM'],
    tagline: 'Control web interfaces with natural language agents',
  },
  {
    repo: 'agentscope-ai/agentscope',
    category: 'agent-frameworks',
    tags: ['agents', 'observability', 'python'],
    frameworks: ['AgentScope', 'Python', 'LLM'],
    tagline: 'Build agents that are visible, understandable, and trusted',
  },
  {
    repo: 'letta-ai/letta',
    category: 'memory',
    tags: ['memory', 'stateful-agents', 'platform'],
    frameworks: ['Letta', 'Python', 'LLM'],
    tagline: 'Build stateful agents with long-term memory',
  },
]

const dryRun = process.argv.includes('--dry-run')
const githubToken = process.env.GITHUB_TOKEN

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function slugForRepo(repo: string) {
  return repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function titleFromRepo(repoName: string) {
  return repoName
    .replace(/[-_]+/g, ' ')
    .replace(/\bmcp\b/gi, 'MCP')
    .replace(/\bai\b/gi, 'AI')
    .replace(/\bapi\b/gi, 'API')
    .replace(/\brag\b/gi, 'RAG')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeLicense(repo: GitHubRepo) {
  const license = repo.license?.spdx_id
  if (!license || license === 'NOASSERTION') return 'Unknown'
  return license
}

function estimateQualityScore(repo: GitHubRepo) {
  const starScore = Math.min(35, (Math.log10(repo.stargazers_count + 1) * 7))
  const freshnessAt = repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0
  const ageDays = freshnessAt ? (Date.now() - freshnessAt) / 86_400_000 : Infinity
  const freshnessScore =
    ageDays <= 30 ? 15 : ageDays <= 90 ? 12 : ageDays <= 180 ? 8 : ageDays <= 365 ? 4 : 0
  const metadataScore = 15
  const reviewScore = 13.5
  return Math.min(100, Math.round((starScore + freshnessScore + metadataScore + reviewScore) * 100) / 100)
}

async function fetchRepo(repo: string): Promise<GitHubRepo> {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub fetch failed for ${repo}: ${response.status} ${body}`)
  }

  return response.json() as Promise<GitHubRepo>
}

function buildSkill(entry: CuratedSkillRepo, repo: GitHubRepo) {
  const description = repo.description || entry.tagline || `${repo.full_name} for AI agent workflows`

  return {
    slug: slugForRepo(repo.full_name),
    name: entry.name || titleFromRepo(repo.name),
    description,
    long_description: `${description}\n\nImported from GitHub because it is a high-star, actively maintained project that can extend AI agent workflows.`,
    tagline: entry.tagline || description,
    author_name: repo.owner.login,
    author_url: repo.owner.html_url,
    repository: repo.html_url,
    github_repo: repo.full_name,
    github_stars: repo.stargazers_count,
    github_forks: repo.forks_count,
    github_language: repo.language,
    github_last_pushed_at: repo.pushed_at,
    category: entry.category,
    tags: entry.tags,
    frameworks: entry.frameworks,
    version: '1.0.0',
    license: normalizeLicense(repo),
    install_command: `npx skills add ${repo.full_name}`,
    verified: repo.stargazers_count >= 1000,
    submission_source: 'github-star-import',
    submitted_by_agent: 'open-agent-skill-curator',
    ai_review_score: {
      total: repo.stargazers_count >= 10000 ? 90 : 82,
      source: 'github-star-import',
    },
    ai_review_approved: true,
    ai_review_issues: [],
    ai_review_suggestions: [],
    downloads: 0,
    used_by: 0,
    rating: 0,
    review_count: 0,
    quality_score: estimateQualityScore(repo),
    quality_signals: {
      source: 'seed:popular',
      model: 'v1',
    },
    last_synced_at: new Date().toISOString(),
  }
}

async function main() {
  const skills = []

  for (const entry of curatedRepos) {
    const repo = await fetchRepo(entry.repo)
    skills.push(buildSkill(entry, repo))
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  skills.sort((a, b) => b.github_stars - a.github_stars)

  if (dryRun) {
    console.table(
      skills.map((skill) => ({
        slug: skill.slug,
        repo: skill.github_repo,
        stars: skill.github_stars,
        quality: skill.quality_score,
        category: skill.category,
      }))
    )
    return
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let insertedOrUpdated = 0

  for (const skill of skills) {
    const { error } = await supabase.from('skills').upsert(skill, {
      onConflict: 'slug',
    })

    if (error) {
      throw new Error(`Failed to upsert ${skill.github_repo}: ${error.message}`)
    }

    insertedOrUpdated += 1
    console.log(`upserted ${skill.github_repo} (${skill.github_stars} stars)`)
  }

  console.log(`Done. Upserted ${insertedOrUpdated} high-star skills.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
