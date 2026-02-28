'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { InstallCommand } from './install-command'
import { LanguageSwitcher } from './language-switcher'

interface Skill {
  id: string
  slug: string
  name: string
  tagline: string
  category: string
  stats: {
    downloads: number
    stars: number
    rating: number
    weeklyGrowth?: number
  }
  technical: {
    installCommand?: string
  }
  compatibility: Array<{ platform: string }>
  author: { name: string }
  verified: boolean
  createdAt: string
}

const SORT_TABS = [
  { key: 'downloads', label: 'Hall of Fame', description: 'Most installed of all time' },
  { key: 'trending', label: 'Trending', description: 'Growing fast right now' },
  { key: 'stars', label: 'Most Starred', description: 'Highest GitHub stars' },
  { key: 'new', label: 'New Arrivals', description: 'Recently published' },
] as const

interface Props {
  skills: Skill[]
  query?: string
  sort: string
  category: string
  categories: string[]
}

export function SkillsPageClient({ skills, query, sort, category, categories }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigate = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== 'all') {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      router.push(`/skills?${params.toString()}`)
    },
    [router, searchParams]
  )

  const activeSort = SORT_TABS.find((t) => t.key === sort) || SORT_TABS[0]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                O
              </span>
              <span className="text-lg sm:text-xl md:text-2xl font-display font-bold">Open Agent Skill</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex gap-6 text-sm">
                <Link href="/submit" className="text-secondary hover:text-foreground transition-colors">Submit</Link>
                <Link href="/docs" className="text-secondary hover:text-foreground transition-colors">{t.nav.docs}</Link>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value
              navigate({ q: q || undefined })
            }}
            className="relative"
          >
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search skills by name, description, or tag..."
              className="w-full border border-border bg-background px-4 py-3 text-sm font-serif focus:border-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-secondary hover:text-foreground"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Sort Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {SORT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => navigate({ sort: tab.key, category })}
                className={`px-4 py-3 text-sm font-serif whitespace-nowrap border-b-2 transition-colors ${
                  sort === tab.key
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-secondary hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Category filters */}
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => navigate({ sort, category: 'all' })}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                category === 'all'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-secondary hover:border-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => navigate({ sort, category: cat })}
                className={`text-xs px-3 py-1.5 border capitalize transition-colors ${
                  category === cat
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-secondary hover:border-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Context line */}
        <div className="mb-8 flex items-baseline justify-between">
          <p className="text-sm text-secondary">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
            {query && <> matching <em>"{query}"</em></>}
            {category !== 'all' && <> in <em>{category}</em></>}
          </p>
          <p className="text-xs text-secondary italic">{activeSort.description}</p>
        </div>

        {/* Skills List */}
        {skills.length === 0 ? (
          <div className="border border-border p-12 text-center">
            <p className="text-secondary mb-4">No skills found.</p>
            <Link href="/skills" className="text-foreground underline text-sm">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {skills.map((skill, index) => (
              <article
                key={skill.id}
                className="border-b border-border pb-10 last:border-0 last:pb-0"
              >
                <div className="flex gap-4 sm:gap-6 items-start">
                  {/* Rank */}
                  <div className="font-mono text-lg text-secondary shrink-0 w-8 text-right pt-1 tabular-nums">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link href={`/skills/${skill.slug}`}>
                          <h2 className="font-display text-2xl sm:text-3xl font-semibold hover:opacity-60 transition-opacity">
                            {skill.name}
                          </h2>
                        </Link>
                        {skill.verified && (
                          <span className="text-xs font-mono border border-border px-2 py-0.5 shrink-0">
                            VERIFIED
                          </span>
                        )}
                        {sort === 'new' && (
                          <span className="text-xs font-mono border border-border px-2 py-0.5 text-secondary shrink-0">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-base text-secondary italic leading-relaxed">
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
                    <div className="flex flex-wrap gap-4 text-sm text-secondary font-mono mb-4">
                      <span title="Downloads">
                        {skill.stats.downloads >= 1000
                          ? `${(skill.stats.downloads / 1000).toFixed(1)}K`
                          : skill.stats.downloads}{' '}
                        installs
                      </span>
                      <span title="GitHub Stars">
                        {skill.stats.stars >= 1000
                          ? `${(skill.stats.stars / 1000).toFixed(1)}K`
                          : skill.stats.stars} stars
                      </span>
                      {skill.stats.rating > 0 && (
                        <span>{skill.stats.rating.toFixed(1)}/5</span>
                      )}
                      {skill.stats.weeklyGrowth && skill.stats.weeklyGrowth > 0 && (
                        <span className="text-foreground">+{skill.stats.weeklyGrowth}% this week</span>
                      )}
                    </div>

                    {/* Platforms + Category */}
                    <div className="flex flex-wrap items-center gap-2">
                      {skill.category && (
                        <button
                          onClick={() => navigate({ sort, category: skill.category })}
                          className="text-xs border border-border px-2 py-1 text-secondary capitalize hover:border-foreground hover:text-foreground transition-colors"
                        >
                          {skill.category}
                        </button>
                      )}
                      {skill.compatibility.slice(0, 5).map((c) => (
                        <span
                          key={c.platform}
                          className="text-xs border border-border px-2 py-1 text-secondary"
                        >
                          {c.platform}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-secondary">
                      by {skill.author.name}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="font-semibold mb-3">{t.skillsPage.footer.platform}</p>
              <ul className="space-y-2 text-secondary">
                <li><Link href="/docs" className="hover:text-foreground">{t.skillsPage.footer.documentation}</Link></li>
                <li><Link href="/api-docs" className="hover:text-foreground">{t.skillsPage.footer.api}</Link></li>
                <li><Link href="/submit" className="hover:text-foreground">{t.skillsPage.footer.submitSkill}</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">{t.skillsPage.footer.community}</p>
              <ul className="space-y-2 text-secondary">
                <li><a href="https://github.com/openagentskill" className="hover:text-foreground">{t.skillsPage.footer.github}</a></li>
                <li><a href="https://discord.gg/openagentskill" className="hover:text-foreground">{t.skillsPage.footer.discord}</a></li>
                <li><a href="https://twitter.com/openagentskill" className="hover:text-foreground">{t.skillsPage.footer.twitter}</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">{t.skillsPage.footer.resources}</p>
              <ul className="space-y-2 text-secondary">
                <li><Link href="/about" className="hover:text-foreground">{t.skillsPage.footer.about}</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">{t.skillsPage.footer.blog}</Link></li>
                <li><Link href="/standards" className="hover:text-foreground">{t.skillsPage.footer.standards}</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
