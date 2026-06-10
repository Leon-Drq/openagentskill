import { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Documentation - Open Agent Skill',
  description: 'Learn how to discover, install, and use skills with your AI agents.',
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-16 lg:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-secondary">Documentation</p>
            <h1 className="mt-5 max-w-4xl font-display text-4xl font-normal leading-[0.98] text-balance sm:text-5xl lg:text-6xl">
              Build with the OpenAgentSkill registry.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
              Learn how to discover, install, submit, and expose skills through agent-friendly APIs.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-14 lg:py-16">

        {/* What are skills? */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'What are skills?'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'Skills are reusable capabilities for AI agents. They provide procedural knowledge that helps agents accomplish specific tasks more effectively. Think of them as plugins or extensions that enhance what your AI agent can do.'}
          </p>
        </section>

        {/* Getting Started */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Getting started'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'To install a skill, use the skills CLI:'}
          </p>
          <div className="border border-border bg-card p-4 sm:p-6 mb-6">
            <pre className="font-mono text-sm sm:text-base overflow-x-auto">
              <code>{'npx skills add owner/repo'}</code>
            </pre>
          </div>
          <p className="text-base sm:text-lg leading-relaxed text-secondary">
            {'This will install the skill and make it available to your AI agent.'}
          </p>
        </section>

        {/* How skills are ranked */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'How skills are ranked'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'The skills leaderboard ranks skills based on anonymous telemetry data collected from the skills CLI. When users install skills, aggregated usage data helps surface the most popular and useful skills in the ecosystem.'}
          </p>
          <p className="text-base sm:text-lg leading-relaxed text-secondary">
            {'This telemetry is completely anonymous and only tracks which skills are being installed—no personal information or usage patterns are collected.'}
          </p>
        </section>

        {/* Browse skills */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Browse skills'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed">
            {'Visit the '}
            <Link href="/skills" className="underline hover:opacity-60 transition-opacity">
              {'skills marketplace'}
            </Link>
            {' to browse the skills leaderboard and discover new capabilities for your agents.'}
          </p>
        </section>

        {/* API Access */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'For AI Agents'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'AI agents can programmatically access skills via our API:'}
          </p>
          <div className="border border-border bg-card p-4 sm:p-6 mb-6">
            <pre className="font-mono text-xs sm:text-sm overflow-x-auto">
              <code>{`# Get all skills in plain text format
GET /api/agent/skills?format=text

# Search for specific skills
GET /api/agent/skills?q=web+research&format=text

# Filter for production-ready trust signals
GET /api/agent/skills?trust=production&format=text

# Get skill details
GET /api/agent/skills/advanced-web-research?format=text`}</code>
            </pre>
          </div>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'The '}
            <code className="font-mono text-sm bg-muted px-2 py-1">{'format=text'}</code>
            {' parameter returns responses optimized for LLM consumption with minimal tokens.'}
          </p>
          <p className="text-base sm:text-lg leading-relaxed">
            <Link href="/api-docs" className="underline hover:opacity-60 transition-opacity">
              {'View full API documentation'}
            </Link>
          </p>
        </section>

        {/* Creating Skills */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Creating skills'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'To create a new skill:'}
          </p>
          <ol className="list-decimal list-inside space-y-3 text-base sm:text-lg leading-relaxed text-secondary mb-6">
            <li>{'Create a GitHub repository with your skill code'}</li>
            <li>{'Add a skill.json manifest file describing your skill'}</li>
            <li>{'Include clear documentation and usage examples'}</li>
            <li>{'Submit your skill to the marketplace'}</li>
          </ol>
          <p className="text-base sm:text-lg leading-relaxed">
            {'Example skill.json structure:'}
          </p>
          <div className="border border-border bg-card p-4 sm:p-6 mt-4">
            <pre className="font-mono text-xs sm:text-sm overflow-x-auto">
              <code>{`{
  "name": "my-awesome-skill",
  "version": "1.0.0",
  "description": "A skill that does something amazing",
  "category": "productivity",
  "platforms": ["langchain", "autogpt"],
  "author": {
    "name": "Your Name",
    "github": "yourusername"
  }
}`}</code>
            </pre>
          </div>
        </section>

        {/* Security */}
        <section className="mb-10 sm:mb-12 lg:mb-16 border-t border-border pt-10 sm:pt-12">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Security'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'We perform routine security audits to assess skills and their contents for malicious content. However, we cannot guarantee the quality or security of every skill listed on openagentskill.com.'}
          </p>
          <p className="text-base sm:text-lg leading-relaxed">
            {'We encourage you to review skills before installing and use your own judgment. To report security issues, please '}
            <a href="mailto:security@openagentskill.com" className="underline hover:opacity-60 transition-opacity">
              {'contact our security team'}
            </a>
            {'.'}
          </p>
        </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
