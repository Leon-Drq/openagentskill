<div align="center">

<img src="./public/placeholder-logo.svg" alt="OpenAgentSkill" width="240" />

# OpenAgentSkill

OpenAgentSkill is the skill layer for AI agents: helping agents find, compare, and install the right reusable skill automatically.

Think npm for AI Agent Skills: a registry, trust layer, and recommendation API for Codex, Claude Code, Cursor, and other agent runtimes.

[![Website](https://img.shields.io/badge/Website-openagentskill.com-black?style=for-the-badge)](https://www.openagentskill.com)
[![GitHub Stars](https://img.shields.io/github/stars/Leon-Drq/openagentskill?style=for-the-badge&logo=github)](https://github.com/Leon-Drq/openagentskill)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

[Browse Skills](https://www.openagentskill.com/skills) |
[Trending](https://www.openagentskill.com/trending) |
[Audit Reports](https://www.openagentskill.com/audits) |
[API Docs](https://www.openagentskill.com/api-docs) |
[Submit](https://www.openagentskill.com/submit)

</div>

---

## What Is OpenAgentSkill?

OpenAgentSkill is a public registry for finding, comparing, auditing, and recommending AI agent skills.

The product is built for three audiences:

| Audience | What they need | OpenAgentSkill surface |
| --- | --- | --- |
| Agent builders | Find reliable skills for a task | Search, rankings, audits, comparisons, agent-friendly APIs |
| Skill authors | Make their skills discoverable and trusted | Submit flow, claim pages, badges, audit reports |
| AI agents | Query skills programmatically | `/api/agent/skills`, `/api/agent/recommend`, `/api/audits/[slug]` |

The long-term goal is to become the trust and routing layer for agent skills: not just a directory, but the place where humans and agents can decide what is safe, useful, maintained, and worth installing.

## Product Surfaces

| Surface | Link | Purpose |
| --- | --- | --- |
| Skill directory | [/skills](https://www.openagentskill.com/skills) | Search and filter the full catalog |
| Agent skills | [/agent-skills](https://www.openagentskill.com/agent-skills) | Search entry for reusable agent skills |
| AI agent skills | [/ai-agent-skills](https://www.openagentskill.com/ai-agent-skills) | Cross-agent discovery for Codex, Claude Code, Cursor, and more |
| Skills registry | [/skills-registry](https://www.openagentskill.com/skills-registry) | Registry positioning, trust signals, and install handoffs |
| Trending | [/trending](https://www.openagentskill.com/trending) | Skills with recent activity signals |
| Hot | [/hot](https://www.openagentskill.com/hot) | High-momentum skills |
| Best lists | [/best](https://www.openagentskill.com/best) | SEO-ready rankings by use case and category |
| Audits | [/audits](https://www.openagentskill.com/audits) | Security, quality, trust, and adoption-readiness reports |
| Agent pages | [/agents](https://www.openagentskill.com/agents) | Agent-specific skill discovery |
| Official creators | [/official](https://www.openagentskill.com/official) | Creator and organization directories |
| Comparisons | [/compare](https://www.openagentskill.com/compare) | Competitive and alternative pages |
| AgentSkills.io alternative | [/alternatives/agentskills-io](https://www.openagentskill.com/alternatives/agentskills-io) | Alternative page for agent skill discovery searches |
| API docs | [/api-docs](https://www.openagentskill.com/api-docs) | Programmatic access for agents and apps |
| Submit | [/submit](https://www.openagentskill.com/submit) | Submit a new skill for review |

## Key Capabilities

- High-star GitHub skill indexing with a skill-only search matrix.
- MCP repositories are intentionally excluded from automated imports.
- Quality, trust, and audit scoring for each skill.
- Daily activity aggregates for trending and hot rankings.
- Agent-friendly search and recommendation APIs.
- Skill audit pages and embeddable README badges.
- SEO pages for use cases, alternatives, guides, reports, rankings, and collections.
- Manual X Web Intent drafts for compliant social sharing.
- Optional X OAuth flow for API-based posting when a paid X API plan is available.

## Agent API

### Recommend Skills For A Task

```bash
curl "https://www.openagentskill.com/api/agent/recommend?task=scrape+websites+and+extract+tables&limit=4"
```

Returns a ranked shortlist with confidence, install command, repository URL, quality profile, decision profile, use cases, and suggested stacks.

### Search Skills

```bash
curl "https://www.openagentskill.com/api/agent/skills?q=browser+automation&trust=production&limit=5"
```

Supported filters include `q`, `category`, `platform`, `trust`, `limit`, and `format=text`.

### Fetch An Audit

```bash
curl "https://www.openagentskill.com/api/audits/crawl4ai"
```

Returns the stored audit report for a skill, including score, risk level, findings, evidence, and recommendation.

### Fetch Rankings

```bash
curl "https://www.openagentskill.com/api/agent/rankings"
```

Returns ranked skills for agent workflows.

## README Badges For Skill Authors

Skill authors can add OpenAgentSkill badges to their own repository README.

```md
[![OpenAgentSkill Trust](https://www.openagentskill.com/api/badge/crawl4ai?metric=trust&label=Trust)](https://www.openagentskill.com/skills/crawl4ai)
[![OpenAgentSkill Audit](https://www.openagentskill.com/api/badge/crawl4ai?metric=audit&label=Audit)](https://www.openagentskill.com/skills/crawl4ai/audit)
[![OpenAgentSkill Quality](https://www.openagentskill.com/api/badge/crawl4ai?metric=quality&label=Quality)](https://www.openagentskill.com/skills/crawl4ai)
```

Replace `crawl4ai` with the skill slug.

## Auto-Discovery

The indexer scans GitHub for high-signal skill repositories and imports approved matches. It now rotates across cross-domain query groups so the catalog can expand beyond developer tools into finance, quant research, documents, data analysis, security, DevOps, RAG, browser automation, commerce, ML/media, and science workflows.

Current import rules:

- Minimum GitHub stars are controlled by `INDEXER_MIN_STARS`.
- Per-run target is controlled by `INDEXER_RUN_TARGET`.
- Search budget is controlled by `INDEXER_MAX_SEARCH_REQUESTS`.
- Search windows rotate across domain query groups each hour, including finance and other vertical workflows.
- MCP and Model Context Protocol repositories are excluded from automated imports.
- Newly imported or updated skill URLs are automatically submitted through the protected IndexNow notification route.
- A daily baseline IndexNow cron refreshes core discovery pages and the sitemap.
- Production indexer routes require `INDEXER_SECRET`.

Useful routes:

```bash
# Run the indexer with automation auth
POST /api/indexer/run

# Run a finance/quant-only import
POST /api/indexer/run
{
  "targetNew": 500,
  "minStars": 500,
  "domains": ["finance"],
  "maxSearchRequests": 100
}

# Inspect recent import summaries
GET /api/indexer/logs

# Refresh GitHub star counts
POST /api/indexer/refresh-stars

# Submit fresh URLs to IndexNow with automation auth
POST /api/indexnow/submit
{
  "slugs": ["crawl4ai"],
  "includeBaseline": true
}
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS v4, shadcn/ui patterns |
| Database | Supabase Postgres |
| Auth and privileged writes | Supabase SSR plus server-only service role routes |
| Analytics | Vercel Analytics |
| Deployment | Vercel |
| Automation | Vercel Cron routes and protected API jobs |
| AI review | Vercel AI SDK / Gateway-compatible review flow |

## Local Development

```bash
git clone https://github.com/Leon-Drq/openagentskill.git
cd openagentskill

pnpm install
cp .env.example .env.local
pnpm dev
```

Validation:

```bash
pnpm run lint
pnpm run build
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase anon key |
| `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Production | Server-only Supabase key for privileged routes |
| `GITHUB_TOKEN` | Recommended | GitHub API token for higher indexer rate limits |
| `INDEXER_SECRET` | Production | Bearer secret for protected indexer routes |
| `CRON_SECRET` | Production | Bearer secret for scheduled maintenance routes |
| `INDEXER_RUN_TARGET` | Optional | Number of new skills to import per run |
| `INDEXER_MIN_STARS` | Optional | Minimum GitHub stars for bulk imports |
| `INDEXER_MAX_SEARCH_REQUESTS` | Optional | GitHub search request budget per run |
| `X_CLIENT_ID` | Optional | X OAuth client ID |
| `X_CLIENT_SECRET` | Optional | X OAuth client secret |
| `X_ALLOWED_USERNAME` | Optional | Allowed X username for token storage |

Never commit production secrets. Keep privileged Supabase and X credentials server-only.

## Database Setup

Apply SQL files in `scripts/` in order. The current schema includes:

- Skills catalog
- Profiles and points
- Activity and feedback events
- Secure public-write RPCs
- Indexer run logs
- X OAuth token storage
- Claims and skill events
- Hardened RLS policies
- Skill audits and daily event aggregates

The latest audit and daily-events migration is:

```text
scripts/013_skill_audits_and_daily_events.sql
```

## Project Structure

```text
app/
  api/
    agent/        Agent-friendly search, rankings, recommendation, feedback
    audits/       Skill audit API
    badge/        SVG badge API
    indexer/      Protected import and maintenance jobs
    x/            X OAuth, Web Intent, and optional posting routes
  skills/         Skill directory and detail pages
  audits/         Audit index
  best/           Best-of ranking pages
  trending/       Trending skills
  hot/            Hot skills
  agents/         Agent-specific pages
  official/       Creator pages
  compare/        Comparison pages
  guides/         Guides and SEO content

lib/
  audits.ts       Audit scoring and normalization
  quality.ts      Quality profiles
  trust.ts        Trust scoring
  decision.ts     Adoption-readiness profile
  rankings.ts     Ranking logic
  indexer/        GitHub discovery and import pipeline
  db/             Supabase data access
  seo/            Programmatic SEO page data

scripts/
  *.sql           Supabase migrations
  *.mjs, *.ts     Content and seed scripts
```

## Roadmap

- [x] Public skill directory
- [x] GitHub auto-indexer for high-star skills
- [x] Skill-only imports with MCP exclusion
- [x] Quality and trust profiles
- [x] Audit reports
- [x] Trending and hot rankings from daily activity
- [x] README badges
- [x] Agent recommendation API
- [x] Programmatic SEO pages
- [ ] Task-based skill evaluations
- [ ] Agent-specific fit scoring for Claude Code, Codex, Cursor, and other agent surfaces
- [ ] Creator claim pages with verified ownership
- [ ] Anonymous install and usage telemetry
- [ ] Semantic search and reranking
- [ ] Public benchmark reports for high-impact skill categories

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Useful contribution types include skill submissions, metadata fixes, audit improvements, SEO guide contributions, API improvements, and UI fixes.

## License

MIT. See [LICENSE](./LICENSE).
