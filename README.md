# Open Agent Skill

**The open marketplace for AI agent skills.** Discover, publish, and compose skills for Claude, GPT, Copilot, and other AI agents.

Website: **[openagentskill.com](https://www.openagentskill.com)**

---

## Why Open Agent Skill?

| Problem | Solution |
|---------|----------|
| Finding quality skills is hard | Curated directory with 35+ verified skills |
| GitHub stars don't reflect real usage | **Agent Feedback Loop** — real usage data from AI agents |
| No incentive for skill authors | Points system rewards authors for every successful call |

---

## Featured Skills by Use Case

### Web Automation and Data Extraction

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [Browser Use](https://github.com/browser-use/browser-use) | 52K | Make AI agents interact with websites using natural language | Automate form filling, web testing, data entry |
| [Crawl4AI](https://github.com/unclecode/crawl4ai) | 42K | LLM-friendly web crawler and scraper | Extract structured data from any website |
| [Firecrawl](https://github.com/mendableai/firecrawl) | 28K | Turn websites into LLM-ready markdown | Build RAG pipelines, content indexing |
| [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) | 43K | Multi-platform social media crawler | Scrape Xiaohongshu, Douyin, Bilibili, Weibo, Zhihu |

### MCP Servers (Model Context Protocol)

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [MCP Memory](https://github.com/modelcontextprotocol/servers) | 18K | Persistent memory using knowledge graphs | Give agents long-term memory across sessions |
| [MCP Filesystem](https://github.com/modelcontextprotocol/servers) | 18K | Secure file operations with access controls | Let agents read/write files safely |

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

### Finance and Research

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [Finance Skills](https://github.com/himself65/finance-skills) | 94 | Options, stocks, sentiment analysis | Build trading bots, financial research agents |
| [Claude Scientific Skills](https://github.com/K-Dense-AI/claude-scientific-skills) | 10K | Research and scientific skills | Academic research, data analysis |

### Productivity

| Skill | Stars | Description | Use Case |
|-------|-------|-------------|----------|
| [Planning With Files](https://github.com/OthmanAdi/planning-with-files) | 14K | Persistent markdown planning workflows | Project management with AI agents |
| [Eigent](https://github.com/eigent-ai/eigent) | 12K | Build custom AI workforce | Multi-agent team collaboration |

[View all 35+ skills →](https://www.openagentskill.com/skills)

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

We automatically discover new skills from GitHub daily using 20+ search patterns:

```
topic:agent-skills    topic:mcp-tool       topic:mcp-server
topic:claude-tool     topic:openai-plugin  topic:langchain-tool
"awesome" "agent skills"                   filename:SKILL.md
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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for indexer) |
| `GITHUB_TOKEN` | GitHub token for API access |

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

**Built with care for the AI agent ecosystem.**

[Website](https://www.openagentskill.com) · [Browse Skills](https://www.openagentskill.com/skills) · [Submit Skill](https://www.openagentskill.com/submit) · [API Docs](https://www.openagentskill.com/docs)
