'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { LanguageSwitcher } from './language-switcher'

interface HomePageEnhancedProps {
  stats: {
    totalSkills: number
    totalDownloads: number
    activePlatforms: number
    agentSubmissions: number
  }
  activities: Array<{
    id: string
    event_type: string
    actor_name: string
    actor_type: string
    description: string
    created_at: string
  }>
  featuredSkills: Array<{
    slug: string
    name: string
    description: string
    github_stars: number
    downloads: number
  }>
}

interface Recommendation {
  skill: string
  slug: string
  confidence: number
  install: string
  reasoning: string
}

function AnimatedNumber({ 
  value, 
  suffix = '', 
  duration = 1800 
}: { 
  value: number
  suffix?: string
  duration?: number 
}) {
  const [display, setDisplay] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current || hasAnimated) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const startTime = performance.now()
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Ease-out cubic for satisfying deceleration
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(Math.floor(eased * value))
            if (progress < 1) {
              requestAnimationFrame(animate)
            } else {
              setDisplay(value)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, duration, hasAnimated])

  return (
    <span ref={ref}>
      {display.toLocaleString()}{suffix}
    </span>
  )
}

export function HomePageEnhanced({ stats, activities, featuredSkills }: HomePageEnhancedProps) {
  const { t } = useI18n()
  const [scrollY, setScrollY] = useState(0)
  const [mounted, setMounted] = useState(false)

  const [taskQuery, setTaskQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [showResults, setShowResults] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleFindSkills = async () => {
    if (!taskQuery.trim() || isSearching) return
    setIsSearching(true)
    setShowResults(true)
    try {
      const res = await fetch(`/api/agent/recommend?task=${encodeURIComponent(taskQuery)}&limit=3`)
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch {
      setRecommendations([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFindSkills()
  }

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return t.activity.timeAgo.justNow
    if (diffInMinutes < 60) return t.activity.timeAgo.minutesAgo.replace('{count}', String(diffInMinutes))
    if (diffInMinutes < 1440) return t.activity.timeAgo.hoursAgo.replace('{count}', String(Math.floor(diffInMinutes / 60)))
    return t.activity.timeAgo.daysAgo.replace('{count}', String(Math.floor(diffInMinutes / 1440)))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Fixed Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-sm bg-background/90 transition-shadow duration-300"
        style={{ boxShadow: scrollY > 50 ? '0 1px 6px rgba(0,0,0,0.06)' : 'none' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-base sm:text-lg font-bold tracking-tight hover:opacity-70 transition-opacity">
            {t.hero.title}
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/skills" className="text-xs sm:text-sm text-secondary hover:text-foreground transition-colors">
              {t.nav.skills}
            </Link>
            <Link href="/submit" className="text-xs sm:text-sm text-secondary hover:text-foreground transition-colors hidden sm:inline">
              {t.nav.submit}
            </Link>
            <Link href="/docs" className="text-xs sm:text-sm text-secondary hover:text-foreground transition-colors hidden md:inline">
              {t.nav.docs}
            </Link>
            <Link href="/activity" className="text-xs sm:text-sm text-secondary hover:text-foreground transition-colors hidden md:inline">
              {t.nav.activity}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* ============================================= */}
      {/* HERO: The core innovation - action-first hero */}
      {/* ============================================= */}
      <section className="pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Animated Title */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 tracking-tight leading-[1.05] text-center">
            {mounted
              ? t.hero.title.split(' ').map((word, i) => (
                  <span
                    key={i}
                    className="inline-block mr-2 sm:mr-3"
                    style={{ animation: `fadeInUp 0.7s ease-out ${i * 0.12}s both` }}
                  >
                    {word}
                  </span>
                ))
              : t.hero.title
            }
          </h1>

          <p
            className="text-center text-lg sm:text-xl text-secondary mb-10 sm:mb-14 leading-relaxed max-w-2xl mx-auto"
            style={{ animation: mounted ? 'fadeInUp 0.7s ease-out 0.5s both' : 'none' }}
          >
            {t.hero.subtitle}
          </p>

          {/* ============================== */}
          {/* THE KEY FEATURE: Task Search   */}
          {/* Agents can use this in one API */}
          {/* ============================== */}
          <div
            ref={searchRef}
            className="mb-8"
            style={{ animation: mounted ? 'fadeInUp 0.7s ease-out 0.7s both' : 'none' }}
          >
            {/* Install Command Preview */}
            <div className="bg-foreground text-background font-mono text-xs sm:text-sm px-4 sm:px-5 py-3 flex items-center justify-between">
              <span>
                <span className="text-background/50">{t.hero.installPrefix}</span>
                {' '}
                <span className="text-background/30">{t.hero.installPlaceholder}</span>
              </span>
              <button
                onClick={() => copyToClipboard('npx skills add ')}
                className="text-background/50 hover:text-background transition-colors text-xs"
              >
                {copiedCmd === 'npx skills add ' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Natural Language Task Input */}
            <div className="border border-t-0 border-border bg-card">
              <div className="px-4 sm:px-5 pt-4 pb-2">
                <label className="text-xs text-secondary font-mono uppercase tracking-wider">
                  {t.hero.orDescribeTask}
                </label>
              </div>
              <div className="flex items-stretch">
                <input
                  type="text"
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.hero.taskPlaceholder}
                  className="flex-1 bg-transparent px-4 sm:px-5 py-3 text-sm sm:text-base outline-none placeholder:text-secondary/50"
                />
                <button
                  onClick={handleFindSkills}
                  disabled={isSearching || !taskQuery.trim()}
                  className="px-5 sm:px-8 bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
                >
                  {isSearching ? t.hero.searching : t.hero.findSkills}
                </button>
              </div>
            </div>

            {/* Recommendation Results */}
            {showResults && (
              <div className="border border-t-0 border-border bg-card">
                <div className="px-4 sm:px-5 py-3 border-b border-border">
                  <span className="text-xs font-mono text-secondary uppercase tracking-wider">
                    {t.hero.recommendedSkills}
                  </span>
                </div>
                {isSearching ? (
                  <div className="px-5 py-8 text-center text-sm text-secondary">
                    <span className="inline-block animate-pulse">{'>'} {t.hero.searching}</span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="divide-y divide-border">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="px-4 sm:px-5 py-4 hover:bg-muted/50 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Link href={`/skills/${rec.slug}`} className="font-semibold text-sm sm:text-base hover:underline">
                                {rec.skill}
                              </Link>
                              <span className="text-xs font-mono text-secondary bg-muted px-2 py-0.5">
                                {Math.round(rec.confidence * 100)}% {t.hero.confidence}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-secondary leading-relaxed line-clamp-2">
                              {rec.reasoning}
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(rec.install)}
                            className="text-xs font-mono bg-foreground text-background px-3 py-1.5 hover:opacity-80 transition-opacity shrink-0"
                          >
                            {copiedCmd === rec.install ? 'Copied!' : t.hero.installCommand}
                          </button>
                        </div>
                        <div className="mt-2 font-mono text-xs text-secondary/60 truncate">
                          {rec.install}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center text-sm text-secondary">
                    {t.hero.noResults}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Agent API Hint */}
          <div
            className="text-center text-xs font-mono text-secondary/60 mb-10 sm:mb-14"
            style={{ animation: mounted ? 'fadeInUp 0.7s ease-out 0.9s both' : 'none' }}
          >
            {'>'} GET /api/agent/recommend?task=your+task
          </div>

          {/* CTA Row */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            style={{ animation: mounted ? 'fadeInUp 0.7s ease-out 1s both' : 'none' }}
          >
            <Link
              href="/skills"
              className="w-full sm:w-auto px-8 py-3.5 bg-foreground text-background text-sm font-semibold text-center hover:opacity-90 transition-all"
            >
              {t.hero.cta.browse}
            </Link>
            <Link
              href="/submit"
              className="w-full sm:w-auto px-8 py-3.5 border border-border text-sm font-semibold text-center hover:bg-muted transition-all"
            >
              {t.hero.cta.submit}
            </Link>
            <Link
              href="/api-docs"
              className="w-full sm:w-auto px-8 py-3.5 border border-border text-sm font-semibold text-center hover:bg-muted transition-all"
            >
              {t.hero.cta.forAgents}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats — Animated countup numbers */}
      <section className="border-y border-border py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={stats.totalSkills} duration={1200} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.skills}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={Math.round(stats.totalDownloads / 1000)} suffix="K+" duration={2000} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.downloads}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={stats.activePlatforms} duration={1400} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.platforms}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={stats.agentSubmissions} duration={1000} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.agentSubmissions}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Leaderboard - Inspired by skills.sh */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-baseline justify-between mb-8 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">{t.featured.title}</h2>
            <Link href="/skills" className="text-sm text-secondary hover:text-foreground transition-colors underline">
              {t.featured.viewAll}
            </Link>
          </div>

          {/* Leaderboard List */}
          <div className="border border-border divide-y divide-border">
            {featuredSkills.map((skill, index) => (
              <Link
                key={skill.slug}
                href={`/skills/${skill.slug}`}
                className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors group"
                style={{ animation: mounted ? `fadeInUp 0.5s ease-out ${index * 0.06 + 0.2}s both` : 'none' }}
              >
                {/* Rank */}
                <span className="text-xl sm:text-2xl font-display font-bold text-secondary/40 w-8 text-right shrink-0">
                  {index + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm sm:text-base group-hover:underline truncate">
                      {skill.name}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-secondary truncate leading-relaxed">
                    {skill.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono text-secondary shrink-0">
                  <span className="hidden sm:inline">{'*'} {(skill.github_stars / 1000).toFixed(1)}K</span>
                  <span>{(skill.downloads / 1000).toFixed(1)}K</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Activity Feed */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-baseline justify-between mb-8 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">{t.activity.title}</h2>
            <Link href="/activity" className="text-sm text-secondary hover:text-foreground transition-colors underline">
              {t.activity.viewAll}
            </Link>
          </div>

          <div className="space-y-0 border-l border-border">
            {activities.slice(0, 6).map((activity, index) => (
              <div
                key={activity.id}
                className="pl-5 sm:pl-6 py-3 relative hover:bg-muted/20 transition-colors"
                style={{ animation: mounted ? `slideInLeft 0.4s ease-out ${index * 0.07}s both` : 'none' }}
              >
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 ${
                  activity.actor_type === 'agent' ? 'bg-foreground' : 'bg-secondary/40'
                }`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {activity.actor_type === 'agent' && (
                        <span className="text-[10px] font-mono bg-foreground text-background px-1.5 py-px leading-normal">
                          AGENT
                        </span>
                      )}
                      <span className="font-mono text-xs sm:text-sm font-semibold">{activity.actor_name}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-secondary leading-relaxed truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-secondary/60 whitespace-nowrap shrink-0">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Essay - Editorial long-form */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-border">
        <article className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-16 sm:mb-20">
            {t.essay.title}
          </h2>

          {Object.entries(t.essay.sections).map(([key, section], i) => (
            <section key={key} className={i > 0 ? 'mt-14 sm:mt-16' : ''}>
              <h3 className="font-display text-xl sm:text-2xl font-bold mb-5">
                {section.title}
              </h3>
              <div className="text-base sm:text-lg leading-[1.8] text-secondary space-y-4">
                {section.content.split('\n').filter(Boolean).map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </section>

      {/* How It Works */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-10 sm:mb-14 text-center">
            {t.howItWorks.title}
          </h2>

          <div className="grid md:grid-cols-3 gap-10 sm:gap-14">
            <div>
              <h3 className="font-display text-lg font-bold mb-4">{t.howItWorks.forDevelopers.title}</h3>
              <ol className="space-y-3">
                {t.howItWorks.forDevelopers.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary leading-relaxed flex gap-2">
                    <span className="font-mono text-foreground/40 shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold mb-4">{t.howItWorks.forAgents.title}</h3>
              <ol className="space-y-3">
                {t.howItWorks.forAgents.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary leading-relaxed flex gap-2">
                    <span className="font-mono text-foreground/40 shrink-0">{i + 1}.</span>
                    <span className={i === 0 ? 'font-mono text-xs' : ''}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold mb-4">{t.howItWorks.forEveryone.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{t.howItWorks.forEveryone.content}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 text-center border-t border-border">
        <div className="max-w-2xl mx-auto">
          <p className="font-display text-xl sm:text-2xl font-medium mb-8 leading-relaxed text-balance">
            {t.finalCta.message}
          </p>
          <Link
            href="/submit"
            className="inline-block px-10 py-4 bg-foreground text-background font-semibold hover:opacity-90 transition-opacity"
          >
            {t.finalCta.button}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-secondary">
            {'(c)'} 2026 Open Agent Skill
          </p>
          <div className="flex items-center justify-center gap-5 mt-3 text-xs text-secondary">
            <Link href="/docs" className="hover:text-foreground transition-colors">{t.nav.docs}</Link>
            <Link href="/api-docs" className="hover:text-foreground transition-colors">{t.nav.apiDocs}</Link>
            <Link href="/activity" className="hover:text-foreground transition-colors">{t.nav.activity}</Link>
            <a href="https://github.com" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
