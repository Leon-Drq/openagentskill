import { Metadata } from 'next'
import Link from 'next/link'
import { mockSkills } from '@/lib/mock-data'
import { InstallCommand } from '@/components/install-command'

export const metadata: Metadata = {
  title: 'Browse Agent Skills - Open Agent Skill',
  description: 'Explore thousands of AI agent skills across all platforms. Find the perfect skills for your autonomous agents.',
  openGraph: {
    title: 'Browse Agent Skills - Open Agent Skill',
    description: 'Explore thousands of AI agent skills across all platforms.',
    type: 'website',
  },
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // Await searchParams in Next.js 16
  const params = await searchParams
  
  // Filter skills based on search
  let filteredSkills = mockSkills

  if (params.q) {
    const query = params.q.toLowerCase()
    filteredSkills = filteredSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        skill.technical.githubRepo?.toLowerCase().includes(query)
    )
  }

  // Sort by downloads by default
  const sortedSkills = [...filteredSkills].sort((a, b) => b.stats.downloads - a.stats.downloads)

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">O</span>
              <span className="text-xl sm:text-2xl font-display font-bold">{'Open Agent Skill'}</span>
            </Link>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
              <Link href="/docs" className="text-secondary hover:text-foreground transition-colors">
                {'docs'}
              </Link>
              <Link href="/api-docs" className="text-secondary hover:text-foreground transition-colors">
                {'api'}
              </Link>
            </div>
          </div>

          {/* Simple Search */}
          <form action="/skills" method="get" className="relative">
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Search skills..."
              className="w-full border border-border bg-background px-4 py-3 text-base font-serif focus:border-foreground focus:outline-none"
            />
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Stats */}
        <div className="mb-8 sm:mb-12 text-center">
          <p className="text-sm text-secondary mb-2">
            {sortedSkills.length} {sortedSkills.length === 1 ? 'skill' : 'skills'}
          </p>
          {params.q && (
            <p className="text-xs text-secondary">
              {'Showing results for "'}{params.q}{'"'} · <Link href="/skills" className="underline">Clear</Link>
            </p>
          )}
        </div>

        {/* Skills List */}
        {sortedSkills.length === 0 ? (
          <div className="border border-border p-12 text-center">
            <p className="text-secondary mb-4">{'No skills found.'}</p>
            <Link href="/skills" className="text-foreground underline text-sm">
              {'View all skills'}
            </Link>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {sortedSkills.map((skill, index) => (
              <article key={skill.id} className="border-b border-border pb-8 sm:pb-12 last:border-0">
                {/* Rank */}
                <div className="flex gap-4 sm:gap-6 items-start">
                  <div className="font-mono text-lg sm:text-xl text-secondary shrink-0 w-8 sm:w-10 text-right pt-1">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Skill Name & Tags */}
                    <div className="mb-4">
                      <Link 
                        href={`/skills/${skill.slug}`}
                        className="inline-block"
                      >
                        <h2 className="font-display text-2xl sm:text-3xl font-semibold hover:opacity-60 transition-opacity mb-2">
                          {skill.name}
                        </h2>
                      </Link>
                      <p className="text-base sm:text-lg text-secondary italic leading-relaxed">
                        {skill.tagline}
                      </p>
                    </div>

                    {/* Install Command */}
                    {skill.technical.installCommand && (
                      <div className="mb-4">
                        <InstallCommand 
                          command={skill.technical.installCommand}
                          skillSlug={skill.slug}
                          compact
                        />
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-secondary font-mono mb-4">
                      <span>{(skill.stats.downloads / 1000).toFixed(1)}k installs</span>
                      <span>★ {(skill.stats.stars / 1000).toFixed(1)}k</span>
                      <span>{skill.stats.rating}/5</span>
                      {skill.stats.weeklyGrowth && skill.stats.weeklyGrowth > 0 && (
                        <span className="text-foreground">↑ {skill.stats.weeklyGrowth}%</span>
                      )}
                    </div>

                    {/* Platforms */}
                    <div className="flex flex-wrap gap-2">
                      {skill.compatibility.slice(0, 6).map((compat) => (
                        <span
                          key={compat.platform}
                          className="text-xs border border-border px-2 py-1 text-secondary"
                        >
                          {compat.platform}
                        </span>
                      ))}
                    </div>

                    {/* Author */}
                    <div className="mt-4 text-xs text-secondary">
                      {'by '}{skill.author.name}
                      {skill.verified && <span className="ml-2 font-mono">✓ VERIFIED</span>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="font-semibold mb-3">{'Platform'}</p>
              <ul className="space-y-2 text-secondary">
                <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="/api-docs" className="hover:text-foreground">API</Link></li>
                <li><Link href="/submit" className="hover:text-foreground">Submit Skill</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">{'Community'}</p>
              <ul className="space-y-2 text-secondary">
                <li><a href="https://github.com/openagentskill" className="hover:text-foreground">GitHub</a></li>
                <li><a href="https://discord.gg/openagentskill" className="hover:text-foreground">Discord</a></li>
                <li><a href="https://twitter.com/openagentskill" className="hover:text-foreground">Twitter</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">{'Resources'}</p>
              <ul className="space-y-2 text-secondary">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/standards" className="hover:text-foreground">Standards</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
