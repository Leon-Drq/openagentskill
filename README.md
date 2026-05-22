<div align="center">

# Open Agent Skill

### The Open Marketplace for AI Agent Skills

[![Website](https://img.shields.io/badge/Website-openagentskill.com-blue?style=for-the-badge)](https://www.openagentskill.com)
[![GitHub Stars](https://img.shields.io/github/stars/Leon-Drq/openagentskill?style=for-the-badge&logo=github)](https://github.com/Leon-Drq/openagentskill)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

**Discover, publish, and share skills for Claude, GPT, Copilot, and other AI agents.**

[Browse Skills](https://www.openagentskill.com/skills) | [Submit Skill](https://www.openagentskill.com/submit) | [API Docs](https://www.openagentskill.com/docs)

</div>

---

## Why Open Agent Skill?

> **"The only skill ranking based on real agent usage, not vanity metrics."**

| Problem | Solution |
|---------|----------|
| Finding quality skills is hard | Curated directory with **90+ verified skills**, ranked by quality score and auto-indexed hourly |
| GitHub stars don't reflect real usage | **Agent Feedback Loop** — real usage data from AI agents |
| No incentive for skill authors | **Points system** rewards authors for every successful call |
| Skills scattered across GitHub | **One-stop marketplace** with search, filters, and categories |

---

## Featured Skills by Use Case

### Web Automation and Data Extraction

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [Browser Use](https://github.com/browser-use/browser-use) | 52K | Make AI agents interact with websites using natural language | Automate form filling, web testing, data entry |
| [Crawl4AI](https://github.com/unclecode/crawl4ai) | 42K | LLM-friendly web crawler and scraper | Extract structured data from any website |
| [Firecrawl](https://github.com/mendableai/firecrawl) | 28K | Turn websites into LLM-ready markdown | Build RAG pipelines, content indexing |
| [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) | 43K | Multi-platform social media crawler | Scrape Xiaohongshu, Douyin, Bilibili, Weibo, Zhihu |

### Integrations and Automation

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [Composio](https://github.com/ComposioHQ/composio) | 15K | 250+ app connectors for AI agents | Connect agents to Slack, GitHub, Notion, etc. |
| [Google Workspace CLI](https://github.com/googleworkspace/cli) | 11K | CLI for Google Workspace APIs | Automate Gmail, Docs, Calendar with agents |

### Developer Tools

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [Cursor Rules](https://github.com/PatrickJS/awesome-cursorrules) | 7.8K | Curated cursor rules for frameworks | Improve AI coding with framework-specific rules |
| [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code) | 25K | Tools for Claude Code workflows | Enhance Claude coding capabilities |

### Finance and Crypto

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [BlockBeats Skill](https://clawhub.ai/BlockBeatsOfficial/blockbeats-skill) | - | Crypto news, market data, on-chain analytics | Track ETF flows, derivatives, macro trends via 1,500+ sources |
| [Finance Skills](https://github.com/himself65/finance-skills) | 94 | Options, stocks, sentiment analysis | Build trading bots, financial research agents |
| [Claude Scientific Skills](https://github.com/K-Dense-AI/claude-scientific-skills) | 10K | Research and scientific skills | Academic research, data analysis |

### Chinese Skills 中文精选

> 专为中文 AI 社区构建的 skills。在网站上点击「中文 Chinese」分类筛选查看。

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [同事.Skill](https://github.com/titanwings/colleague-skill) | 6.8K | 把同事的工作经验和性格永久保存为 AI Skill | 用同事的语气写代码、回答问题，支持飞书/钉钉/微信数据源 |
| [WeChat Article Exporter](https://github.com/wechat-article/wechat-article-exporter) | 7.9K | 微信公众号文章批量下载工具 | 导出文章含阅读量、评论，支持 Docker/Cloudflare 部署 |
| [DBSkill](https://github.com/dontbesilent2025/dbskill) | - | 从 12,307 条推文提炼的商业诊断工具箱 | 商业模式诊断、对标分析、内容创作、执行力诊断 |

### Productivity

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [ClawFeed](https://github.com/kevinho/clawfeed) | 1.6K | AI-powered news digest from multiple sources | Curate Twitter, RSS, HackerNews, Reddit into summaries |
| [Planning With Files](https://github.com/OthmanAdi/planning-with-files) | 14K | Persistent markdown planning workflows | Project management with AI agents |
| [Eigent](https://github.com/eigent-ai/eigent) | 12K | Build custom AI workforce | Multi-agent team collaboration |

<div align="center">

**[View all 90+ skills →](https://www.openagentskill.com/skills)**

</div>

---

## Agent Feedback API

**The unique feature that sets us apart.** Track real agent usage, not just GitHub stars.

### Report Skill Usage

```bash
curl -X POST https://www.openagentskill.com/api/agent/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "skill_slug": "browser-use",
    "agent_id": "claude-3.5",
    "success": true,
    "latency_ms": 1200
  }'
```

### Query Skill Stats

```bash
# Get stats for a specific skill
curl "https://www.openagentskill.com/api/agent/feedback?skill_slug=browser-use"

# Get leaderboard (sorted by agent calls)
curl "https://www.openagentskill.com/api/agent/feedback"
```

### Response Example

```json
{
  "skill_slug": "browser-use",
  "total_calls": 12847,
  "success_rate": 94.2,
  "avg_latency_ms": 850,
  "unique_agents": 156
}
```

---

## Quick Start

### Browse Skills

Visit [openagentskill.com/skills](https://www.openagentskill.com/skills) to explore all skills with filters by category, popularity, and trending.

### Submit a Skill

1. Go to [openagentskill.com/submit](https://www.openagentskill.com/submit)
2. Enter your GitHub repository URL
3. AI reviews your skill automatically
4. Approved skills appear in the directory within minutes

### Auto-Discovery

We automatically discover new skills from GitHub hourly using a skill-only search matrix. MCP servers and Model Context Protocol integrations are intentionally excluded from automated imports.

```
topic:agent-skills    "agent skill"        topic:ai-agent
topic:claude-tool     topic:openai-plugin  topic:langchain-tool
topic:browser-use     topic:rag            topic:workflow-automation
```

---

## Points System

Skill authors earn points for contributions:

| Event | Points |
|-------|--------|
| Skill called successfully by an agent | +1 |
| Skill submitted and approved | +50 |
| Invite a new user | +100 |

Points unlock badges and future rewards.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Deployment | Vercel |
| AI Review | Vercel AI Gateway |

---

## Local Development

```bash
# Clone
git clone https://github.com/Leon-Drq/openagentskill.git
cd openagentskill

# Install
pnpm install

# Setup environment
cp .env.example .env.local
# Fill in your Supabase credentials

# Run
pnpm dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key for privileged automation/admin routes |
| `GITHUB_TOKEN` | GitHub token for API access |
| `INDEXER_SECRET` | Bearer secret required for indexer/blog routes and reviewed skill-submission RPC writes in production |
| `INDEXER_RUN_TARGET` | Optional. Hourly bulk-import target per run, defaults to `10`, max `500` |
| `INDEXER_MIN_STARS` | Optional. Minimum GitHub stars for bulk import, defaults to `500` |
| `INDEXER_MAX_SEARCH_REQUESTS` | Optional. GitHub search requests per bulk run, defaults to `10` without `GITHUB_TOKEN` |
| `CRON_SECRET` | Bearer secret required for cron-triggered maintenance routes in production |
| `X_CLIENT_ID` | X OAuth 2.0 client ID for authorizing the posting account |
| `X_CLIENT_SECRET` | X OAuth 2.0 client secret for token exchange and refresh |
| `X_ALLOWED_USERNAME` | Optional. X username allowed for OAuth storage, defaults to `openagentskill` |

### Database Setup

Apply SQL files in `scripts/` in order. They create the skills catalog, profiles and points ledger, activity feed, agent feedback loop, aggregate stats view, and RLS policies.

Production writes should go through the Next.js API routes. Public feedback, reviewed skill submissions, and indexer writes use narrow Supabase RPCs guarded by server secrets, while public clients can only read approved skills and aggregate stats directly.

The hourly indexer defaults to high-star, skill-only bulk discovery. It scans GitHub repositories matching agent skill, browser automation, RAG, workflow, and developer-tool signals, excludes MCP repositories, then imports up to `INDEXER_RUN_TARGET` new approved skills per run. Use `GET /api/indexer/logs` with automation auth to inspect recent run summaries. Use `POST /api/indexer/run` with `mode: "reviewed"` for the slower README/AI-review path.

X posting supports two paths. The free, manual path is `/api/x/intent`, which generates a daily skill draft and redirects to the official X Web Intent composer; the user must click Post, and no X API credits are used. The paid API path uses OAuth 2.0 with PKCE: visit `/api/x/auth` while signed in as the allowed X account to store an encrypted refresh token, then `/api/x/post-daily` can publish one high-quality unposted skill when called with automation auth. It is intentionally not scheduled in `vercel.json`.

---

## Project Structure

```
app/
├── api/
│   ├── agent/feedback/   # Agent Feedback API
│   ├── indexer/          # Auto-indexer endpoints
│   └── skills/           # Skills CRUD
├── skills/               # Skills listing and detail pages
├── submit/               # Skill submission flow
└── profile/              # User profile and points

lib/
├── indexer/              # GitHub auto-discovery
├── ai-review/            # AI-powered skill review
└── db/                   # Database queries
```

---

## Roadmap

- [x] Skill marketplace with search and filters
- [x] Auto-indexer for GitHub skill discovery
- [x] User authentication and profiles
- [x] Points and rewards system
- [x] Agent Feedback Loop API
- [ ] Skill composition engine
- [ ] Bounty system for skill requests
- [ ] Revenue sharing for popular skills

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- Submit your skills to the directory
- Report bugs or suggest features via Issues
- Improve documentation
- Add new integrations

---

## License

MIT License — see [LICENSE](./LICENSE)

---

<div align="center">

**Built with love for the AI agent ecosystem.**

[![Website](https://img.shields.io/badge/Visit-openagentskill.com-blue?style=flat-square)](https://www.openagentskill.com)
[![Twitter](https://img.shields.io/badge/Follow-@drq__ai-1DA1F2?style=flat-square&logo=twitter)](https://twitter.com/drq_ai)

[Browse Skills](https://www.openagentskill.com/skills) | [Submit Skill](https://www.openagentskill.com/submit) | [API Docs](https://www.openagentskill.com/docs)

</div>
