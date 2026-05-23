'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { InstallCommand } from './install-command'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

interface AgentStats {
  total_calls: number
  success_calls: number
  success_rate: number | null
  avg_latency_ms: number | null
  unique_agents: number
}

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
    qualityScore?: number
    weeklyGrowth?: number
  }
  technical: {
    installCommand?: string
  }
  compatibility: Array<{ platform: string }>
  author: { name: string }
  verified: boolean
  createdAt: string
  agentStats?: AgentStats | null
}

const SORT_TABS = [
  { key: 'quality', label: 'Recommended', description: 'Best blend of quality, stars, freshness, and agent usage' },
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
      <SiteHeader />

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
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
              className="w-full border border-border bg-card py-3 pl-4 pr-20 text-sm focus:border-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-secondary hover:text-foreground"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Sort Tabs */}
      <div className="border-b border-border bg-background sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {SORT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => navigate({ sort: tab.key, category })}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
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
                {cat === 'chinese' ? '中文 Chinese' : cat}
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
                      {/* Agent Calls - 核心指标 */}
                      {skill.agentStats && skill.agentStats.total_calls > 0 && (
                        <>
                          <span title="Agent Calls" className="text-foreground font-semibold">
                            {skill.agentStats.total_calls >= 1000
                              ? `${(skill.agentStats.total_calls / 1000).toFixed(1)}K`
                              : skill.agentStats.total_calls}{' '}
                            agent calls
                          </span>
                          {skill.agentStats.success_rate !== null && (
                            <span 
                              title="Success Rate"
                              className={skill.agentStats.success_rate >= 90 ? 'text-foreground' : skill.agentStats.success_rate >= 70 ? 'text-secondary' : 'text-red-600'}
                            >
                              {skill.agentStats.success_rate}% success
                            </span>
                          )}
                        </>
                      )}
                      <span title="GitHub Stars">
                        {skill.stats.stars >= 1000
                          ? `${(skill.stats.stars / 1000).toFixed(1)}K`
                          : skill.stats.stars} stars
                      </span>
                      {typeof skill.stats.qualityScore === 'number' && skill.stats.qualityScore > 0 && (
                        <span title="Quality Score">
                          {Math.round(skill.stats.qualityScore)} quality
                        </span>
                      )}
                      {skill.stats.downloads > 0 && (
                        <span title="Downloads">
                          {skill.stats.downloads >= 1000
                            ? `${(skill.stats.downloads / 1000).toFixed(1)}K`
                            : skill.stats.downloads}{' '}
                          installs
                        </span>
                      )}
                    </div>

                    {/* Platforms + Category */}
                    <div className="flex flex-wrap items-center gap-2">
                      {skill.category && (
                        <button
                          onClick={() => navigate({ sort, category: skill.category })}
                          className="text-xs border border-border px-2 py-1 text-secondary capitalize hover:border-foreground hover:text-foreground transition-colors"
                        >
                          {skill.category === 'chinese' ? '中文' : skill.category}
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

      <SiteFooter />
    </div>
  )
}
