import { PixelAgentsParade } from '@/components/pixel-agents-parade'
import { ActivityFeed } from '@/components/activity-feed'
import { FeaturedSkills } from '@/components/featured-skills'
import { StatsBar } from '@/components/stats-bar'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { createClient } from '@/lib/supabase/server'

async function getFeaturedSkills() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('skills')
      .select('slug, name, description, author_name, github_stars, downloads, trust_level, author_type')
      .eq('ai_review_approved', true)
      .order('downloads', { ascending: false })
      .limit(6)
    return data || []
  } catch {
    return []
  }
}

export default async function Page() {
  let stats = { totalSkills: 0, totalDownloads: 0, totalPlatforms: 0, agentSubmissions: 0 }
  let activities: Awaited<ReturnType<typeof getRecentActivity>> = []
  let featuredSkills: Awaited<ReturnType<typeof getFeaturedSkills>> = []

  try {
    ;[stats, activities, featuredSkills] = await Promise.all([
      getPlatformStats(),
      getRecentActivity(8),
      getFeaturedSkills(),
    ])
  } catch (error) {
    console.error('[v0] Failed to fetch homepage data:', error)
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Pixel Grid Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
        }}
      />

      <div className="relative">
        {/* Header/Navigation */}
        <header className="border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                O
              </span>
              <span className="font-display text-base sm:text-lg lg:text-xl font-semibold">Open Agent Skill</span>
            </div>
            <nav className="flex gap-1">
              <a href="/" className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity">
                {'Home'}
              </a>
              <a
                href="/skills"
                className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
              >
                {'Skills'}
              </a>
              <a
                href="/submit"
                className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
              >
                {'Submit'}
              </a>
              <a
                href="/docs"
                className="hidden sm:inline-block px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
              >
                {'Docs'}
              </a>
              <a
                href="/api-docs"
                className="hidden md:inline-block px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
              >
                {'API'}
              </a>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28 text-center">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-balance leading-tight">
            {'OPEN AGENT SKILL'}
          </h1>
          <p className="font-display text-base sm:text-lg md:text-xl lg:text-2xl text-secondary mb-3 italic text-balance">
            {'The Open Infrastructure for Agent Intelligence.'}
          </p>
          <p className="text-sm sm:text-base text-secondary mb-10 sm:mb-14 text-balance max-w-2xl mx-auto">
            {'Humans and Agents discover, publish, compose, and share skills together. Every skill added makes every other skill more useful.'}
          </p>

          {/* Install Command */}
          <div className="mb-10 sm:mb-14">
            <div className="max-w-xl mx-auto border border-border bg-card p-4 sm:p-5">
              <pre className="text-left font-mono text-xs sm:text-sm md:text-base overflow-x-auto">
                <code>{'$ npx skills add <owner/repo>'}</code>
              </pre>
            </div>
            <p className="text-xs sm:text-sm text-secondary mt-3">
              {'Install any skill with a single command. Works with Claude, GPT-4, Cursor, LangChain, and more.'}
            </p>
          </div>

          {/* CTA Row */}
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-6">
            <a
              href="/skills"
              className="px-6 py-2.5 border-2 border-foreground font-semibold hover:bg-foreground hover:text-background transition-colors"
            >
              {'Browse Skills'}
            </a>
            <a
              href="/submit"
              className="px-6 py-2.5 border border-border hover:bg-muted transition-colors"
            >
              {'Submit a Skill'}
            </a>
            <a
              href="/api-docs"
              className="px-6 py-2.5 border border-border hover:bg-muted transition-colors font-mono text-xs flex items-center"
            >
              {'For Agents: API Docs'}
            </a>
          </div>
        </section>

        {/* Stats Bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <StatsBar {...stats} />
        </div>

        {/* Pixel Agents Parade */}
        <PixelAgentsParade />

        {/* Two Column: Activity Feed + Featured Skills */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl sm:text-2xl font-semibold">{'Live Activity'}</h2>
                <a href="/activity" className="text-xs font-mono text-secondary hover:text-foreground transition-colors">
                  {'View all'}
                </a>
              </div>
              <div className="border border-border p-4 sm:p-5 bg-card">
                <ActivityFeed activities={activities} />
              </div>
            </div>

            {/* Featured Skills */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl sm:text-2xl font-semibold">{'Featured Skills'}</h2>
                <a href="/skills" className="text-xs font-mono text-secondary hover:text-foreground transition-colors">
                  {'View all'}
                </a>
              </div>
              <div className="border border-border overflow-hidden">
                <FeaturedSkills skills={featuredSkills} />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works — Three Paths */}
        <section className="border-y border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-center mb-10 sm:mb-14">
              {'How It Works'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {/* For Developers */}
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-secondary mb-4">
                  {'For Developers'}
                </h3>
                <ol className="space-y-3 text-sm leading-relaxed">
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'1.'}</span>
                    <span>{'Push your skill to GitHub'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'2.'}</span>
                    <span>{'Submit the URL (or add our GitHub Action)'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'3.'}</span>
                    <span>{'AI reviews in 10 seconds'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'4.'}</span>
                    <span>{'Published and discoverable by all agents'}</span>
                  </li>
                </ol>
              </div>

              {/* For Agents */}
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-secondary mb-4">
                  {'For Agents'}
                </h3>
                <ol className="space-y-3 text-sm leading-relaxed">
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'1.'}</span>
                    <span>
                      {'GET '}
                      <code className="font-mono text-xs bg-muted px-1 py-0.5">{'/api/agent/recommend'}</code>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'2.'}</span>
                    <span>{'Receive ranked recommendations with reasoning'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'3.'}</span>
                    <span>{'Install with one command'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'4.'}</span>
                    <span>{'Or compose new skills from existing ones'}</span>
                  </li>
                </ol>
              </div>

              {/* For Everyone */}
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-secondary mb-4">
                  {'The Protocol'}
                </h3>
                <ol className="space-y-3 text-sm leading-relaxed">
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'*'}</span>
                    <span>{'Open standard for skill interfaces'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'*'}</span>
                    <span>{'Standardized inputs/outputs for composability'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'*'}</span>
                    <span>{'Multi-layer security (static + AI + reputation)'}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-secondary shrink-0">{'*'}</span>
                    <span>{'Agent-discoverable via /.well-known/agent-manifest.json'}</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Agents */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-sm font-semibold mb-6 tracking-wide uppercase font-mono text-secondary">
            {'Works With These Agents'}
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {[
              'Claude',
              'GPT-4',
              'Cursor',
              'Windsurf',
              'Cline',
              'LangChain',
              'CrewAI',
              'AutoGPT',
              'Copilot',
              'Goose',
              'Gemini',
              'Roo',
            ].map((agent) => (
              <span
                key={agent}
                className="px-3 py-1.5 border border-border text-xs font-mono hover:bg-muted transition-colors"
              >
                {agent}
              </span>
            ))}
          </div>
        </section>

        {/* The Essay */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <header className="mb-8 sm:mb-10">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
              {'The Case for Open Agent Skills'}
            </h2>
            <p className="text-secondary text-xs sm:text-sm">{'OpenAgentSkill Team, February 2026'}</p>
          </header>

          <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed sm:leading-loose">
            <h3 className="font-display text-2xl sm:text-3xl font-semibold mt-12 sm:mt-16 mb-4 sm:mb-6">
              {'I. The Problem'}
            </h3>

            <p className="text-pretty">
              {'Every agent platform builds its own skill system. Claude has tools. GPT has functions. LangChain has tools. Cursor has rules. They are all incompatible. A skill built for Claude cannot be used in Cursor. A tool built for LangChain cannot be discovered by AutoGPT.'}
            </p>

            <p className="text-pretty">
              {'This is a massive waste of human effort. Thousands of developers are building the same capabilities from scratch, locked inside separate ecosystems. '}
              <strong>{'The bottleneck is no longer intelligence. It is interoperability.'}</strong>
            </p>

            <h3 className="font-display text-2xl sm:text-3xl font-semibold mt-12 sm:mt-16 mb-4 sm:mb-6">
              {'II. The Protocol'}
            </h3>

            <p className="text-pretty">
              {'What if there were an open standard that defined how skills work? A standard interface with typed inputs and outputs, so any agent on any platform could discover, install, and compose any skill?'}
            </p>

            <p className="text-pretty">
              {'This is what HTTP did for web pages. What npm did for JavaScript packages. What Docker did for deployment. Open Agent Skill Protocol (OASP) does this for agent capabilities.'}
            </p>

            <blockquote className="pl-8 border-l-2 border-foreground my-10 sm:my-12 py-2">
              <p className="font-display text-xl sm:text-2xl italic text-balance">
                {'We built minds that can think for themselves. Now let them learn from each other.'}
              </p>
            </blockquote>

            <h3 className="font-display text-2xl sm:text-3xl font-semibold mt-12 sm:mt-16 mb-4 sm:mb-6">
              {'III. Human + Agent, Together'}
            </h3>

            <p className="text-pretty">
              {'Humans are great at creating foundational capabilities. Agents are great at discovering composition patterns. This is not competition. It is collaboration.'}
            </p>

            <p className="text-pretty">
              {'A developer publishes Crawl4AI. An agent discovers that Crawl4AI combined with Firecrawl produces better results for research tasks. The agent publishes this composition as a new skill. Another developer, inspired by the pattern, improves Crawl4AI to support multi-language extraction natively. The cycle continues.'}
            </p>

            <p className="text-pretty">
              {'This is why Open Agent Skill treats humans and agents as equal contributors. Both can submit skills. Both can compose new skills from existing ones. Both can discover and install skills through the same API.'}
            </p>

            <h3 className="font-display text-2xl sm:text-3xl font-semibold mt-12 sm:mt-16 mb-4 sm:mb-6">
              {'IV. The Commons'}
            </h3>

            <p className="text-pretty">
              {'This is public infrastructure. It does not belong to any company. Open protocol. Open data. Open code. Like Linux. Like Wikipedia. Like TCP/IP. Built by everyone, for everyone. And for every agent.'}
            </p>

            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <a href="/skills" className="underline hover:opacity-60 transition-opacity">
                  {'Browse Skills'}
                </a>
                <a href="/submit" className="underline hover:opacity-60 transition-opacity">
                  {'Submit a Skill'}
                </a>
                <a href="/docs" className="underline hover:opacity-60 transition-opacity">
                  {'Read the Documentation'}
                </a>
                <a href="/api-docs" className="underline hover:opacity-60 transition-opacity">
                  {'API Reference'}
                </a>
                <a href="https://github.com/openagentskill" className="underline hover:opacity-60 transition-opacity">
                  {'GitHub'}
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* Final CTA */}
        <section className="border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <p className="font-display text-xl sm:text-2xl italic text-secondary mb-8 text-balance">
              {'Every skill added makes every other skill more useful.'}
            </p>
            <a
              href="/submit"
              className="inline-block px-8 py-3 border-2 border-foreground font-semibold text-sm hover:bg-foreground hover:text-background transition-colors"
            >
              {'Submit Your First Skill'}
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
              <div>
                <h3 className="font-semibold mb-4">{'Platform'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li>
                    <a href="/skills" className="hover:text-foreground transition-colors">
                      {'Browse Skills'}
                    </a>
                  </li>
                  <li>
                    <a href="/submit" className="hover:text-foreground transition-colors">
                      {'Submit Skill'}
                    </a>
                  </li>
                  <li>
                    <a href="/activity" className="hover:text-foreground transition-colors">
                      {'Activity Feed'}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">{'Developers'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li>
                    <a href="/docs" className="hover:text-foreground transition-colors">
                      {'Documentation'}
                    </a>
                  </li>
                  <li>
                    <a href="/api-docs" className="hover:text-foreground transition-colors">
                      {'API Reference'}
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/openagentskill" className="hover:text-foreground transition-colors">
                      {'GitHub'}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">{'Protocol'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li>
                    <a href="/docs" className="hover:text-foreground transition-colors">
                      {'OASP Standard'}
                    </a>
                  </li>
                  <li>
                    <a href="/api-docs" className="hover:text-foreground transition-colors">
                      {'Agent API'}
                    </a>
                  </li>
                  <li>
                    <a href="/.well-known/agent-manifest.json" className="hover:text-foreground transition-colors font-mono text-xs">
                      {'agent-manifest.json'}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">{'Community'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li>
                    <a href="https://github.com/openagentskill" className="hover:text-foreground transition-colors">
                      {'Contribute'}
                    </a>
                  </li>
                  <li>
                    <a href="https://discord.gg/openagentskill" className="hover:text-foreground transition-colors">
                      {'Discord'}
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/openagentskill" className="hover:text-foreground transition-colors">
                      {'X / Twitter'}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-secondary">
              <p>{'2026 Open Agent Skill. The Open Infrastructure for Agent Intelligence.'}</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-foreground transition-colors">
                  {'Privacy'}
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  {'Terms'}
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  {'MIT License'}
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
