'use client'

import { useEffect, useState } from 'react'
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

export function HomePageEnhanced({ stats, activities, featuredSkills }: HomePageEnhancedProps) {
  const { t } = useI18n()
  const [scrollY, setScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return t.activity.timeAgo.justNow
    if (diffInMinutes < 60) return t.activity.timeAgo.minutesAgo.replace('{count}', String(diffInMinutes))
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return t.activity.timeAgo.hoursAgo.replace('{count}', String(hours))
    }
    const days = Math.floor(diffInMinutes / 1440)
    return t.activity.timeAgo.daysAgo.replace('{count}', String(days))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal Navigation - Inspired by web4.ai */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-sm bg-background/90 transition-all duration-300"
        style={{ 
          boxShadow: scrollY > 50 ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' 
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="font-display text-xl font-bold tracking-tight hover:opacity-70 transition-opacity"
          >
            {t.hero.title}
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/skills" className="text-sm hover:underline hidden sm:inline">
              {t.nav.skills}
            </Link>
            <Link href="/submit" className="text-sm hover:underline hidden md:inline">
              {t.nav.submit}
            </Link>
            <Link href="/docs" className="text-sm hover:underline hidden lg:inline">
              {t.nav.docs}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero Section with Animated Title */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 
            className={`font-display text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-[1.1] tracking-tight transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            {t.hero.title.split(' ').map((word, i) => (
              <span 
                key={i} 
                className="inline-block mr-3 sm:mr-4"
                style={{
                  animation: isVisible ? `fadeInUp 0.8s ease-out ${i * 0.1}s both` : 'none'
                }}
              >
                {word}
              </span>
            ))}
          </h1>
          
          <p 
            className={`text-lg sm:text-2xl text-secondary mb-12 leading-relaxed max-w-3xl mx-auto transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            {t.hero.subtitle}
          </p>

          {/* CTA Buttons */}
          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '900ms' }}
          >
            <Link
              href="/skills"
              className="w-full sm:w-auto px-8 py-4 bg-foreground text-background font-semibold text-center hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
            >
              {t.hero.cta.browse}
            </Link>
            <Link
              href="/api-docs"
              className="w-full sm:w-auto px-8 py-4 border-2 border-border hover:bg-muted transition-all duration-200 text-center hover:scale-[1.02]"
            >
              {t.hero.cta.forAgents}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar - Animated on Scroll */}
      <section className="border-y border-border bg-muted py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="font-display text-4xl sm:text-5xl font-bold mb-2">{stats.totalSkills}</div>
              <div className="text-sm sm:text-base text-secondary">{t.stats.skills}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl sm:text-5xl font-bold mb-2">{(stats.totalDownloads / 1000).toFixed(0)}K+</div>
              <div className="text-sm sm:text-base text-secondary">{t.stats.downloads}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl sm:text-5xl font-bold mb-2">{stats.activePlatforms}</div>
              <div className="text-sm sm:text-base text-secondary">{t.stats.platforms}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-4xl sm:text-5xl font-bold mb-2">{stats.agentSubmissions}</div>
              <div className="text-sm sm:text-base text-secondary">{t.stats.agentSubmissions}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Activity Feed - Inspired by web4.ai's dynamic feel */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8 sm:mb-12">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2">{t.activity.title}</h2>
              <p className="text-secondary text-sm sm:text-base">Real-time contributions from humans and agents</p>
            </div>
            <Link href="/activity" className="text-sm underline hover:opacity-70 transition-opacity whitespace-nowrap">
              {t.activity.viewAll}
            </Link>
          </div>
          
          <div className="space-y-4">
            {activities.slice(0, 6).map((activity, index) => (
              <div
                key={activity.id}
                className="border-l-2 border-border pl-4 sm:pl-6 py-3 hover:border-foreground transition-all duration-300 group"
                style={{
                  animation: isVisible ? `slideInLeft 0.5s ease-out ${index * 0.1}s both` : 'none'
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {activity.actor_type === 'agent' && (
                        <span className="text-xs font-mono bg-foreground text-background px-2 py-0.5">
                          AGENT
                        </span>
                      )}
                      <span className="font-mono text-sm font-semibold">{activity.actor_name}</span>
                    </div>
                    <p className="text-sm text-secondary leading-relaxed group-hover:text-foreground transition-colors">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-secondary whitespace-nowrap">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Skills - Clean Grid */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8 sm:mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">{t.featured.title}</h2>
            <Link href="/skills" className="text-sm underline hover:opacity-70 transition-opacity">
              {t.featured.viewAll}
            </Link>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredSkills.map((skill, index) => (
              <Link
                key={skill.slug}
                href={`/skills/${skill.slug}`}
                className="bg-background border border-border p-6 hover:border-foreground transition-all duration-300 group"
                style={{
                  animation: isVisible ? `fadeIn 0.6s ease-out ${index * 0.1 + 0.3}s both` : 'none'
                }}
              >
                <h3 className="font-display text-xl font-semibold mb-3 group-hover:underline">
                  {skill.name}
                </h3>
                <p className="text-sm text-secondary mb-4 line-clamp-2 leading-relaxed">
                  {skill.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-secondary font-mono">
                  <span>★ {(skill.github_stars / 1000).toFixed(1)}K</span>
                  <span>↓ {(skill.downloads / 1000).toFixed(1)}K</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Essay Section - web4.ai inspired long-form */}
      <section className="py-24 sm:py-32 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto space-y-16">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-center mb-16">
            {t.essay.title}
          </h1>

          <section className="space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {t.essay.sections.problem.title}
            </h2>
            <div className="text-base sm:text-lg leading-relaxed text-secondary space-y-4">
              {t.essay.sections.problem.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {t.essay.sections.protocol.title}
            </h2>
            <div className="text-base sm:text-lg leading-relaxed text-secondary space-y-4">
              {t.essay.sections.protocol.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {t.essay.sections.humanAgent.title}
            </h2>
            <div className="text-base sm:text-lg leading-relaxed text-secondary space-y-4">
              {t.essay.sections.humanAgent.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {t.essay.sections.commons.title}
            </h2>
            <div className="text-base sm:text-lg leading-relaxed text-secondary space-y-4">
              {t.essay.sections.commons.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        </article>
      </section>

      {/* How It Works - Three Columns */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-12 text-center">
            {t.howItWorks.title}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold mb-4">
                {t.howItWorks.forDevelopers.title}
              </h3>
              <ol className="space-y-3">
                {t.howItWorks.forDevelopers.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary leading-relaxed">
                    <span className="font-mono mr-2">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold mb-4">
                {t.howItWorks.forAgents.title}
              </h3>
              <ol className="space-y-3">
                {t.howItWorks.forAgents.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary leading-relaxed">
                    <span className="font-mono mr-2">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold mb-4">
                {t.howItWorks.forEveryone.title}
              </h3>
              <p className="text-sm text-secondary leading-relaxed">
                {t.howItWorks.forEveryone.content}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="font-display text-2xl sm:text-3xl font-medium mb-8 leading-relaxed">
            {t.finalCta.message}
          </p>
          <Link
            href="/submit"
            className="inline-block px-10 py-5 bg-foreground text-background font-semibold text-lg hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
          >
            {t.finalCta.button}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-secondary">
            © 2026 Open Agent Skill · Open protocol, open data, open code
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-secondary">
            <Link href="/docs" className="hover:underline">{t.nav.docs}</Link>
            <Link href="/api-docs" className="hover:underline">{t.nav.apiDocs}</Link>
            <Link href="/activity" className="hover:underline">{t.nav.activity}</Link>
            <a href="https://github.com" className="hover:underline" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
