import { Metadata } from 'next'
import Link from 'next/link'
import { mockSkills } from '@/lib/mock-data'
import { SkillCard } from '@/components/skill-card'
import { SearchBar } from '@/components/search-bar'
import { SkillFilters } from '@/components/skill-filters'

export const metadata: Metadata = {
  title: 'Browse Agent Skills - Open Agent Skill',
  description: 'Explore thousands of AI agent skills across all platforms. Find the perfect skills for your autonomous agents.',
  openGraph: {
    title: 'Browse Agent Skills - Open Agent Skill',
    description: 'Explore thousands of AI agent skills across all platforms.',
    type: 'website',
  },
}

export default function SkillsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; platform?: string; pricing?: string }
}) {
  // Filter skills based on search params
  let filteredSkills = mockSkills

  if (searchParams.q) {
    const query = searchParams.q.toLowerCase()
    filteredSkills = filteredSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  }

  if (searchParams.category && searchParams.category !== 'all') {
    filteredSkills = filteredSkills.filter(
      (skill) => skill.category === searchParams.category
    )
  }

  if (searchParams.platform && searchParams.platform !== 'all') {
    filteredSkills = filteredSkills.filter((skill) =>
      skill.compatibility.some((c) => c.platform === searchParams.platform)
    )
  }

  if (searchParams.pricing && searchParams.pricing !== 'all') {
    filteredSkills = filteredSkills.filter(
      (skill) => skill.pricing.type === searchParams.pricing
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-baseline justify-between mb-8">
            <Link href="/" className="text-4xl font-display font-bold text-foreground">
              {'Open Agent Skill'}
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/skills" className="text-foreground underline">
                {'Browse'}
              </Link>
              <Link href="/docs" className="text-secondary hover:text-foreground">
                {'Documentation'}
              </Link>
              <Link href="/submit" className="text-secondary hover:text-foreground">
                {'Submit Skill'}
              </Link>
            </nav>
          </div>
          <SearchBar />
        </div>
      </header>

      {/* Filters */}
      <SkillFilters />

      {/* Results */}
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">
            {searchParams.q ? `Search Results for "${searchParams.q}"` : 'Browse Agent Skills'}
          </h1>
          <p className="text-secondary text-lg">
            {filteredSkills.length} {filteredSkills.length === 1 ? 'skill' : 'skills'} found
          </p>
        </div>

        {filteredSkills.length === 0 ? (
          <div className="border border-border bg-card p-12 text-center">
            <p className="text-xl text-secondary mb-4">{'No skills found matching your criteria.'}</p>
            <Link href="/skills" className="text-foreground underline">
              {'Clear filters'}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-display text-xl font-semibold mb-4">{'Open Agent Skill'}</h3>
              <p className="text-secondary leading-relaxed">
                {'The open marketplace for AI agent skills. Built by the community, for the community.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{'Resources'}</h4>
              <ul className="space-y-2 text-secondary">
                <li><Link href="/docs" className="hover:text-foreground">{'Documentation'}</Link></li>
                <li><Link href="/api" className="hover:text-foreground">{'API Reference'}</Link></li>
                <li><Link href="/standards" className="hover:text-foreground">{'Standards'}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{'Community'}</h4>
              <ul className="space-y-2 text-secondary">
                <li><Link href="/github" className="hover:text-foreground">{'GitHub'}</Link></li>
                <li><Link href="/discord" className="hover:text-foreground">{'Discord'}</Link></li>
                <li><Link href="/twitter" className="hover:text-foreground">{'Twitter'}</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
