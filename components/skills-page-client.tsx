'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { InstallCommand } from './install-command'
import { SaveSkillButton } from './save-skill-button'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'
import type { UseCaseDefinition } from '@/lib/use-cases'

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
  qualityProfile?: {
    score: number
    tier: string
    label: string
    summary: string
    warnings: string[]
  }
  platformHints?: string[]
}

const SORT_TABS = [
  { key: 'quality', label: 'Recommended', description: 'Best blend of quality, stars, freshness, and agent usage' },
  { key: 'downloads', label: 'Hall of Fame', description: 'Most installed of all time' },
  { key: 'trending', label: 'Trending', description: 'Growing fast right now' },
  { key: 'stars', label: 'Most Starred', description: 'Highest GitHub stars' },
  { key: 'fresh', label: 'Fresh', description: 'Recently pushed on GitHub' },
  { key: 'new', label: 'New Arrivals', description: 'Recently published' },
] as const

const QUALITY_TABS = [
  { key: 'all', label: 'Any quality' },
  { key: 'excellent', label: 'Excellent' },
  { key: 'strong', label: 'Strong' },
  { key: 'promising', label: 'Promising' },
] as const

const STAR_OPTIONS = [
  { value: '0', label: 'Any stars' },
  { value: '500', label: '500+ stars' },
  { value: '1000', label: '1K+ stars' },
  { value: '5000', label: '5K+ stars' },
] as const

interface Props {
  skills: Skill[]
  query?: string
  sort: string
  category: string
  categories: string[]
  useCase: string
  useCases: UseCaseDefinition[]
  platform: string
  platformOptions: string[]
  quality: string
  minStars: number
}

export function SkillsPageClient({
  skills,
  query,
  sort,
  category,
  categories,
  useCase,
  useCases,
  platform,
  platformOptions,
  quality,
  minStars,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [compareSlugs, setCompareSlugs] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = JSON.parse(window.localStorage.getItem('openagentskill.compare') || '[]')
      if (Array.isArray(stored)) return stored.filter((item) => typeof item === 'string').slice(0, 4)
    } catch {
      return []
    }
    return []
  })

  useEffect(() => {
    window.localStorage.setItem('openagentskill.compare', JSON.stringify(compareSlugs))
  }, [compareSlugs])

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
  const compareSkills = useMemo(
    () => compareSlugs
      .map((slug) => skills.find((skill) => skill.slug === slug) || { slug, name: slug })
      .filter(Boolean),
    [compareSlugs, skills]
  )

  const toggleCompare = (slug: string) => {
    setCompareSlugs((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug)
      return [...current, slug].slice(-4)
    })
  }

  const clearFilters = () => {
    router.push('/skills')
  }

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
              placeholder="Describe a task, repo need, platform, or skill name..."
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
          <div className="flex max-w-full flex-wrap gap-0">
            {SORT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => navigate({ sort: tab.key, category })}
                className={`px-3 py-3 text-sm whitespace-nowrap border-b-2 transition-colors sm:px-4 ${
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
        <section className="mb-8 border border-border bg-card p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary">Decision filters</p>
              <h1 className="mt-2 font-display text-2xl font-semibold">Choose skills by scenario, quality, and trust signals.</h1>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="self-start border border-border px-3 py-1.5 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground sm:self-auto"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs text-secondary">Use case</span>
              <select
                value={useCase}
                onChange={(e) => navigate({ useCase: e.target.value })}
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                <option value="all">Any use case</option>
                {useCases.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.shortTitle}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-secondary">Platform fit</span>
              <select
                value={platform}
                onChange={(e) => navigate({ platform: e.target.value })}
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                <option value="all">Any platform</option>
                {platformOptions.slice(0, 40).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-secondary">Quality tier</span>
              <select
                value={quality}
                onChange={(e) => navigate({ quality: e.target.value })}
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {QUALITY_TABS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-secondary">GitHub adoption</span>
              <select
                value={String(minStars)}
                onChange={(e) => navigate({ minStars: e.target.value === '0' ? undefined : e.target.value })}
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {STAR_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

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
            {query && <> matching <em>&quot;{query}&quot;</em></>}
            {category !== 'all' && <> in <em>{category}</em></>}
            {useCase !== 'all' && <> for <em>{useCases.find((item) => item.slug === useCase)?.shortTitle || useCase}</em></>}
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
                        <Link href={`/skills/${skill.slug}`} className="min-w-0 max-w-full">
                          <h2 className="max-w-full font-display text-2xl sm:text-3xl font-semibold break-words [overflow-wrap:anywhere] hover:opacity-60 transition-opacity">
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
                        {skill.qualityProfile && (
                          <span className="text-xs font-mono border border-border px-2 py-0.5 text-secondary shrink-0">
                            {skill.qualityProfile.label.toUpperCase()} · {skill.qualityProfile.score}
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
                      {skill.platformHints && skill.platformHints.length > 0 && (
                        <span title="Platform fit">
                          {skill.platformHints.slice(0, 2).join(' + ')}
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

                    {skill.qualityProfile && (
                      <div className="mb-4 max-w-2xl border-l border-border pl-3 text-xs leading-relaxed text-secondary">
                        {skill.qualityProfile.summary}
                        {skill.qualityProfile.warnings.length > 0 && (
                          <span className="block mt-1">
                            Check: {skill.qualityProfile.warnings.slice(0, 2).join(' · ')}
                          </span>
                        )}
                      </div>
                    )}

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

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-secondary">
                      <span>by {skill.author.name}</span>
                      <SaveSkillButton skillSlug={skill.slug} compact />
                      <button
                        type="button"
                        onClick={() => toggleCompare(skill.slug)}
                        className={`border px-2.5 py-1 transition-colors ${
                          compareSlugs.includes(skill.slug)
                            ? 'border-foreground text-foreground'
                            : 'border-border text-secondary hover:border-foreground hover:text-foreground'
                        }`}
                      >
                        {compareSlugs.includes(skill.slug) ? 'In compare' : 'Compare'}
                      </button>
                      <Link
                        href={`/compare?skills=${encodeURIComponent(skill.slug)}`}
                        className="border border-border px-2.5 py-1 text-secondary transition-colors hover:border-foreground hover:text-foreground"
                      >
                        Quick view
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {compareSlugs.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <span className="font-mono text-xs uppercase tracking-widest text-secondary">Compare</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {compareSkills.map((skill) => (
                  <button
                    key={skill.slug}
                    type="button"
                    onClick={() => toggleCompare(skill.slug)}
                    className="border border-border px-2 py-1 text-xs text-secondary hover:border-foreground hover:text-foreground"
                  >
                    {skill.name} x
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCompareSlugs([])}
                className="border border-border px-4 py-2 text-xs text-secondary hover:border-foreground hover:text-foreground"
              >
                Clear
              </button>
              <Link
                href={`/compare?skills=${encodeURIComponent(compareSlugs.join(','))}`}
                className="border border-foreground bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-80"
              >
                Compare {compareSlugs.length}
              </Link>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
