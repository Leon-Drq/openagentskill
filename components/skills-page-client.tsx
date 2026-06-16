'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { InstallCommand } from './install-command'
import { SaveSkillButton } from './save-skill-button'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'
import type { AgentSafetyProfile } from '@/lib/agent-safety'
import type { SkillSupplyProfile, SupplyTrackSummary } from '@/lib/supply'
import type { SkillTrustProfile } from '@/lib/trust'
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
  trustProfile?: SkillTrustProfile
  safetyProfile?: AgentSafetyProfile
  platformHints?: string[]
  supplyProfile?: SkillSupplyProfile
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

const TRUST_OPTIONS = [
  { key: 'all', label: 'Any trust' },
  { key: 'production', label: 'Production candidate' },
  { key: 'strong', label: 'Strong shortlist' },
  { key: 'review', label: 'Manual review' },
  { key: 'risk', label: 'High review required' },
] as const

const SAFETY_OPTIONS = [
  { key: 'all', label: 'Any safety' },
  { key: 'verified', label: 'Verified' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'experimental', label: 'Experimental' },
  { key: 'blocked', label: 'Blocked' },
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
  trust: string
  safety: string
  supplyTrack: string
  supplyTracks: SupplyTrackSummary[]
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
  trust,
  safety,
  supplyTrack,
  supplyTracks,
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
  const activeTrack = supplyTracks.find((track) => track.slug === supplyTrack)
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
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-6 py-12 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-secondary">Skill Registry</p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-normal leading-[0.98] text-balance md:text-6xl">
              Find the right skill for the job your agent is doing.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-secondary md:text-lg">
              Search by task, platform, trust profile, or GitHub adoption. OpenAgentSkill keeps the interface human-readable and the API ready for agents.
            </p>
          </div>

          <div className="border border-border bg-card/85 p-4 shadow-[0_18px_60px_rgba(23,23,23,0.05)] backdrop-blur">
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
                className="w-full border border-border bg-background py-3 pl-4 pr-24 text-sm focus:border-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] bg-[#006b4f] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Search
              </button>
            </form>
            <div className="mt-4 grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-3">
                <div className="font-mono text-lg text-foreground">{skills.length.toLocaleString()}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Results</div>
              </div>
              <div className="bg-background p-3">
                <div className="font-mono text-lg text-foreground">{categories.length.toLocaleString()}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Tracks</div>
              </div>
              <div className="bg-background p-3">
                <div className="font-mono text-lg text-foreground">{platformOptions.length.toLocaleString()}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Targets</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card/35">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Supply tracks</p>
              <h2 className="mt-2 font-display text-2xl font-normal">Build the registry by domain, not just by count.</h2>
            </div>
            {supplyTrack !== 'all' && (
              <Link
                href="/skills"
                className="self-start border border-border px-3 py-1.5 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground sm:self-auto"
              >
                Clear track
              </Link>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {supplyTracks.map((track) => (
              <Link
                key={track.slug}
                href={track.href}
                className={`min-w-0 border p-4 transition-colors ${
                  supplyTrack === track.slug
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background/80 hover:border-foreground'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${supplyTrack === track.slug ? 'text-background/70' : 'text-secondary'}`}>
                      {track.shortLabel}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold">{track.label}</h3>
                  </div>
                  <span className={`shrink-0 font-mono text-sm ${supplyTrack === track.slug ? 'text-background' : 'text-secondary'}`}>
                    {track.count.toLocaleString()}
                  </span>
                </div>
                <p className={`mt-3 line-clamp-2 text-sm leading-relaxed ${supplyTrack === track.slug ? 'text-background/75' : 'text-secondary'}`}>
                  {track.description}
                </p>
                <div className={`mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider ${supplyTrack === track.slug ? 'text-background/70' : 'text-secondary'}`}>
                  <span>{track.highQualityCount.toLocaleString()} quality</span>
                  <span>{track.maintainedCount.toLocaleString()} maintained</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sort Tabs */}
      <div className="sticky top-14 z-40 border-b border-border bg-background/92 backdrop-blur">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <section className="mb-8 border border-border bg-card/80 p-4 shadow-[0_16px_48px_rgba(23,23,23,0.04)] sm:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Decision filters</p>
              <h2 className="mt-2 font-display text-2xl font-normal">Choose by scenario, quality, and trust signals.</h2>
              {activeTrack && (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">
                  Active supply track: <span className="text-foreground">{activeTrack.label}</span>. {activeTrack.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="self-start border border-border px-3 py-1.5 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground sm:self-auto"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              <span className="mb-1 block text-xs text-secondary">Trust profile</span>
              <select
                value={trust}
                onChange={(e) => navigate({ trust: e.target.value })}
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {TRUST_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-secondary">Safety gate</span>
              <select
                value={safety}
                onChange={(e) => navigate({ safety: e.target.value })}
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {SAFETY_OPTIONS.map((item) => (
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
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-sm text-secondary">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
            {query && <> matching <em>&quot;{query}&quot;</em></>}
            {category !== 'all' && <> in <em>{category}</em></>}
            {supplyTrack !== 'all' && <> inside <em>{activeTrack?.shortLabel || supplyTrack}</em></>}
            {useCase !== 'all' && <> for <em>{useCases.find((item) => item.slug === useCase)?.shortTitle || useCase}</em></>}
            {trust !== 'all' && <> with <em>{TRUST_OPTIONS.find((item) => item.key === trust)?.label || trust}</em></>}
            {safety !== 'all' && <> gated as <em>{SAFETY_OPTIONS.find((item) => item.key === safety)?.label || safety}</em></>}
          </p>
          <p className="text-xs text-secondary italic">{activeSort.description}</p>
        </div>

        {/* Skills List */}
        {skills.length === 0 ? (
          <div className="border border-border bg-card/70 p-12 text-center">
            <p className="text-secondary mb-4">No skills found.</p>
            <Link href="/skills" className="text-foreground underline text-sm">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4">
            {skills.map((skill, index) => (
              <article
                key={skill.id}
                className="min-w-0 overflow-hidden border border-border bg-card/75 p-5 transition-colors hover:border-foreground/50 sm:p-6"
              >
                <div className="flex min-w-0 items-start gap-3 sm:gap-6">
                  {/* Rank */}
                  <div className="w-6 shrink-0 pt-1 text-right font-mono text-base tabular-nums text-secondary sm:w-8 sm:text-lg">
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
                        {skill.trustProfile && (
                          <span className="text-xs font-mono border border-border px-2 py-0.5 text-secondary shrink-0">
                            TRUST · {skill.trustProfile.score}
                          </span>
                        )}
                        {skill.safetyProfile && (
                          <span className={`shrink-0 border px-2 py-0.5 font-mono text-xs ${
                            skill.safetyProfile.blocked
                              ? 'border-red-300 text-red-700'
                              : skill.safetyProfile.safety_tier.tier === 'verified'
                                ? 'border-[#006b4f] text-[#006b4f]'
                                : 'border-border text-secondary'
                          }`}>
                            SAFE · {skill.safetyProfile.safety_tier.badge}
                          </span>
                        )}
                        {skill.supplyProfile && (
                          <span className="text-xs font-mono border border-border px-2 py-0.5 text-secondary shrink-0">
                            {skill.supplyProfile.track.shortLabel.toUpperCase()}
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
                      {skill.trustProfile && (
                        <span title="Trust Score">
                          {skill.trustProfile.score} trust
                        </span>
                      )}
                      {skill.safetyProfile && (
                        <span title="Safety gate">
                          {skill.safetyProfile.safety_tier.label}
                        </span>
                      )}
                      {skill.platformHints && skill.platformHints.length > 0 && (
                        <span title="Platform fit">
                          {skill.platformHints.slice(0, 2).join(' + ')}
                        </span>
                      )}
                      {skill.supplyProfile && (
                        <>
                          <span title="Maintenance">
                            {skill.supplyProfile.maintenance.label}
                          </span>
                          <span title="Risk">
                            {skill.supplyProfile.risk.label}
                          </span>
                        </>
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

                    {(skill.qualityProfile || skill.trustProfile || skill.safetyProfile) && (
                      <div className="mb-4 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {skill.qualityProfile && (
                          <div className="border-l border-border pl-3 text-xs leading-relaxed text-secondary">
                            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-secondary">
                              Quality
                            </span>
                            {skill.qualityProfile.summary}
                            {skill.qualityProfile.warnings.length > 0 && (
                              <span className="mt-1 block">
                                Check: {skill.qualityProfile.warnings.slice(0, 2).join(' · ')}
                              </span>
                            )}
                          </div>
                        )}
                        {skill.trustProfile && (
                          <div className="border-l border-border pl-3 text-xs leading-relaxed text-secondary">
                            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-secondary">
                              Trust
                            </span>
                            {skill.trustProfile.summary}
                            {skill.trustProfile.warnings.length > 0 && (
                              <span className="mt-1 block">
                                Review: {skill.trustProfile.warnings.slice(0, 2).join(' · ')}
                              </span>
                            )}
                          </div>
                        )}
                        {skill.safetyProfile && (
                          <div className="border-l border-border pl-3 text-xs leading-relaxed text-secondary">
                            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-secondary">
                              Safety gate
                            </span>
                            {skill.safetyProfile.safety_tier.summary}
                            <span className="mt-1 block">
                              Action: {skill.safetyProfile.safety_tier.recommended_action}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {skill.supplyProfile && (
                      <div className="mb-4 grid max-w-4xl gap-px border border-border bg-border text-xs sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          {
                            label: 'Scenario',
                            value: skill.supplyProfile.scenario.label,
                            detail: skill.supplyProfile.scenario.description,
                          },
                          {
                            label: 'Agents',
                            value: skill.supplyProfile.applicableAgents.slice(0, 3).join(' + '),
                            detail: `${skill.supplyProfile.install.targetCount} install targets`,
                          },
                          {
                            label: 'Maintenance',
                            value: skill.supplyProfile.maintenance.status,
                            detail: skill.supplyProfile.maintenance.label,
                          },
                          {
                            label: 'Risk',
                            value: skill.supplyProfile.risk.label,
                            detail: skill.supplyProfile.risk.notes.slice(0, 1).join(''),
                          },
                          ...(skill.safetyProfile ? [{
                            label: 'Gate',
                            value: skill.safetyProfile.safety_tier.auto_install_policy,
                            detail: skill.safetyProfile.safety_tier.label,
                          }] : []),
                        ].map((item) => (
                          <div key={item.label} className="min-w-0 bg-background p-3">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">{item.label}</p>
                            <p className="mt-1 truncate font-semibold capitalize text-foreground">{item.value}</p>
                            <p className="mt-1 line-clamp-2 leading-relaxed text-secondary">{item.detail}</p>
                          </div>
                        ))}
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
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
