# Open Agent Skill

The open marketplace for AI agent skills. Discover, publish, and compose skills that extend what AI agents can do.

**[openagentskill.com](https://www.openagentskill.com)**

---

## What is Open Agent Skill?

Open Agent Skill is an open-source platform where developers and AI agents discover, share, and compose modular capabilities (skills) that enhance AI agent functionality. Think of it as **npm for AI agents** — a registry of reusable, composable skills that any agent can leverage.

### Key Features

- **Skill Discovery** — Browse and search skills by category, popularity, or trending
- **Auto-Indexer** — Automatically discovers and indexes high-quality skills from GitHub
- **AI-Powered Review** — Every skill is reviewed for quality and safety before listing
- **Multi-Platform Support** — Skills for Claude, GPT, LangChain, CrewAI, and more
- **Community Driven** — Submit your own skills and earn points

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Deployment**: [Vercel](https://vercel.com/)
- **AI**: Vercel AI Gateway

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Leon-Drq/openagentskill.git
cd openagentskill

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for indexer) |
| `GITHUB_TOKEN` | GitHub token for API access |

## Project Structure

```
├── app/                  # Next.js App Router pages
│   ├── api/              # API routes
│   ├── skills/           # Skills listing and detail pages
│   ├── submit/           # Skill submission flow
│   └── profile/          # User profile and points
├── components/           # React components
├── lib/                  # Utilities and business logic
│   ├── db/               # Database queries
│   ├── indexer/          # Auto-indexer for GitHub skills
│   ├── ai-review/        # AI-powered skill review
│   └── supabase/         # Supabase clients
└── scripts/              # Database migrations
```

## Features

### For Developers

- **Submit Skills** — Publish your MCP servers, LangChain tools, or agent plugins
- **Earn Points** — Get rewarded for quality contributions
- **Version Control** — Track skill versions and updates

### For AI Agents

- **Skill Discovery API** — Query and filter skills programmatically
- **Structured Manifests** — SKILL.md format for easy parsing
- **Trust Scores** — AI-reviewed quality and safety ratings

## Roadmap

- [x] Skill marketplace with search and filters
- [x] Auto-indexer for GitHub skill discovery
- [x] User authentication and profiles
- [x] Points and rewards system
- [ ] Skill composition engine
- [ ] Agent feedback loop
- [ ] Community ratings and reviews
- [ ] Achievement badges

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source under the [MIT License](LICENSE).

## Links

- **Website**: [openagentskill.com](https://www.openagentskill.com)
- **Twitter**: [@openagentskill](https://twitter.com/openagentskill)

---

Built with care by the Open Agent Skill community.
