import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API Reference - Open Agent Skill',
  description: 'Agent-friendly API for discovering and integrating skills programmatically.',
}

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">O</span>
              <span className="text-xl sm:text-2xl font-display font-bold text-foreground">{'Open Agent Skill'}</span>
            </Link>
            <nav className="flex gap-3 sm:gap-6 text-xs sm:text-sm">
              <Link href="/skills" className="text-secondary hover:text-foreground">
                {'Skills'}
              </Link>
              <Link href="/docs" className="text-secondary hover:text-foreground">
                {'Docs'}
              </Link>
              <Link href="/api-docs" className="text-foreground underline">
                {'API'}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 max-w-4xl py-8 sm:py-12 lg:py-16">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
          {'API Reference'}
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-secondary mb-10 sm:mb-12 lg:mb-16 leading-relaxed">
          {'Agent-friendly API for discovering and integrating skills programmatically. Supports both JSON and plain text responses optimized for LLMs.'}
        </p>

        {/* Base URL */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Base URL'}
          </h2>
          <div className="bg-card p-4 sm:p-6 font-mono text-sm sm:text-base overflow-x-auto border border-border">
            {'https://openagentskill.com/api/agent'}
          </div>
        </section>

        {/* Format Parameter */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Response Formats'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'All endpoints support two response formats via the '}
            <code className="font-mono text-sm bg-muted px-2 py-1">{'format'}</code>
            {' parameter:'}
          </p>
          <ul className="space-y-3 text-base sm:text-lg leading-relaxed text-secondary mb-6">
            <li>
              <code className="font-mono text-sm bg-muted px-2 py-1 text-foreground">{'format=json'}</code>
              {' (default) - Structured JSON response'}
            </li>
            <li>
              <code className="font-mono text-sm bg-muted px-2 py-1 text-foreground">{'format=text'}</code>
              {' - Plain text optimized for LLM consumption (uses fewer tokens)'}
            </li>
          </ul>
        </section>

        {/* Endpoints */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8">
            {'Endpoints'}
          </h2>

          {/* GET /api/agent/skills */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/skills'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Search and filter agent skills.'}
              </p>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Query Parameters'}</h3>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 text-sm sm:text-base">
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'q'}</code>
                  <span className="text-secondary ml-2">{'- Search query'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'category'}</code>
                  <span className="text-secondary ml-2">{'- Filter by category'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'platform'}</code>
                  <span className="text-secondary ml-2">{'- Filter by platform'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'sort'}</code>
                  <span className="text-secondary ml-2">{'- Sort by: downloads, stars, rating, trending'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'format'}</code>
                  <span className="text-secondary ml-2">{'- Response format: json or text'}</span>
                </div>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Request'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border mb-4 sm:mb-6">
                <code>
                  {'GET /api/agent/skills?q=web+research&format=text'}
                </code>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Response (text format)'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                <code>{`=== Agent Skills Search Results ===

Total: 2 skills found

---
[1] Advanced Web Research
- Slug: advanced-web-research
- Category: Research & Analysis
- Install: npx skills add openagentskill/web-research
- Downloads: 45,230
- Rating: 4.8/5
- Description: Comprehensive web research with multi-source aggregation

[2] Code Review Assistant
- Slug: code-review-assistant
- Category: Developer Tools
- Install: npx skills add openagentskill/code-review
- Downloads: 38,912
- Rating: 4.7/5
- Description: Automated code review with security analysis`}</code>
              </div>
            </div>
          </div>

          {/* GET /api/agent/skills/[slug] */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/skills/{slug}'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get detailed information about a specific skill.'}
              </p>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Request'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border mb-4 sm:mb-6">
                <code>
                  {'GET /api/agent/skills/advanced-web-research?format=text'}
                </code>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Response (text format)'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                <code>{`=== Advanced Web Research ===

INSTALL:
npx skills add openagentskill/web-research

DESCRIPTION:
Comprehensive web research with multi-source aggregation

CATEGORY: Research & Analysis
PLATFORMS: LangChain, LlamaIndex

STATS:
- Downloads: 45,230
- Stars: 3,421
- Rating: 4.8/5 (423 reviews)

TECHNICAL:
- Version: 2.3.1
- Languages: Python, TypeScript
- Repository: https://github.com/openagentskill/web-research
- License: MIT

USAGE:
This skill enables agents to perform comprehensive web research...`}</code>
              </div>
            </div>
          </div>
        </section>

        {/* Agent Protocol */}
        <section className="mb-10 sm:mb-12 lg:mb-16 border-t border-border pt-10 sm:pt-12">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Agent Protocol Discovery'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'AI agents can automatically discover our API capabilities via the standard agent protocol file:'}
          </p>
          <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
            <code>{'GET /.well-known/agent-protocol.json'}</code>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Rate Limits'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-secondary">
            {'Currently no rate limits for read operations. Fair use policy applies. For higher limits, '}
            <a href="mailto:api@openagentskill.com" className="underline hover:opacity-60 transition-opacity">
              {'contact us'}
            </a>
            {'.'}
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-12 sm:mt-20">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs sm:text-sm text-secondary">
              {'Open Agent Skill API • Built for agents, by agents'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
