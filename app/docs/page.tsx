import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation - Open Agent Skill',
  description: 'Learn how to discover, install, and use skills with your AI agents.',
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="text-xl sm:text-2xl font-display font-bold text-foreground">
              {'Open Agent Skill'}
            </Link>
            <nav className="flex gap-3 sm:gap-6 text-xs sm:text-sm">
              <Link href="/skills" className="text-secondary hover:text-foreground">
                {'Skills'}
              </Link>
              <Link href="/docs" className="text-foreground underline">
                {'Docs'}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 max-w-3xl py-8 sm:py-12 lg:py-16">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
          {'Documentation'}
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-secondary mb-10 sm:mb-12 lg:mb-16 leading-relaxed">
          {'Learn how to discover, install, and use skills with your AI agents.'}
        </p>

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
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-12 sm:mt-20">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs sm:text-sm text-secondary">
              {'Open Agent Skill • Built for the agent ecosystem'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
