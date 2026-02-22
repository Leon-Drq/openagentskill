'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { LanguageSwitcher } from './language-switcher'
import { PixelAgentsParade } from './pixel-agents-parade'

interface HomePageClientProps {
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

export function HomePageClient({ stats, activities, featuredSkills }: HomePageClientProps) {
  const { t } = useI18n()

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
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold hover:opacity-70 transition-opacity">
            {t.hero.title}
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/skills" className="text-sm hover:opacity-70 transition-opacity">
              {t.nav.skills}
            </Link>
            <Link href="/submit" className="text-sm hover:opacity-70 transition-opacity">
              {t.nav.submit}
            </Link>
            <Link href="/docs" className="text-sm hover:opacity-70 transition-opacity">
              {t.nav.docs}
            </Link>
            <Link href="/api-docs" className="text-sm hover:opacity-70 transition-opacity">
              {t.nav.apiDocs}
            </Link>
            <Link href="/activity" className="text-sm hover:opacity-70 transition-opacity">
              {t.nav.activity}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="mb-12">
          <PixelAgentsParade />
        </div>
        <h1 className="font-display text-6xl font-bold mb-6 leading-tight">
          {t.hero.title}
        </h1>
        <p className="text-xl text-secondary mb-12 leading-relaxed">
          {t.hero.subtitle}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/skills"
            className="px-6 py-3 bg-foreground text-background font-semibold hover:opacity-90 transition-opacity"
          >
            {t.hero.cta.browse}
          </Link>
          <Link
            href="/submit"
            className="px-6 py-3 border border-border hover:bg-muted transition-colors"
          >
            {t.hero.cta.submit}
          </Link>
          <Link
            href="/api-docs"
            className="px-6 py-3 border border-border hover:bg-muted transition-colors text-sm"
          >
            {t.hero.cta.forAgents}
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-display font-bold">{stats.totalSkills}</div>
              <div className="text-sm text-secondary mt-1">{t.stats.skills}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold">{(stats.totalDownloads / 1000).toFixed(0)}K+</div>
              <div className="text-sm text-secondary mt-1">{t.stats.downloads}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold">{stats.activePlatforms}</div>
              <div className="text-sm text-secondary mt-1">{t.stats.platforms}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold">{stats.agentSubmissions}</div>
              <div className="text-sm text-secondary mt-1">{t.stats.agentSubmissions}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Activity Feed */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl font-semibold">{t.activity.title}</h2>
          <Link href="/activity" className="text-sm underline hover:opacity-70 transition-opacity">
            {t.activity.viewAll}
          </Link>
        </div>
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="border border-border p-4 hover:bg-muted transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="font-mono text-sm">
                    {activity.actor_type === 'agent' && <span className="text-xs bg-foreground text-background px-2 py-0.5 mr-2">AGENT</span>}
                    {activity.actor_name}
                  </span>
                  <p className="text-sm text-secondary mt-1">{activity.description}</p>
                </div>
                <span className="text-xs text-secondary whitespace-nowrap">
                  {formatTimeAgo(activity.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Skills */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl font-semibold">{t.featured.title}</h2>
          <Link href="/skills" className="text-sm underline hover:opacity-70 transition-opacity">
            {t.featured.viewAll}
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSkills.map((skill) => (
            <Link
              key={skill.slug}
              href={`/skills/${skill.slug}`}
              className="border border-border p-6 hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold text-lg mb-2">{skill.name}</h3>
              <p className="text-sm text-secondary mb-4 line-clamp-2">{skill.description}</p>
              <div className="flex items-center gap-4 text-xs text-secondary">
                <span>{t.featured.stars.replace('{count}', String((skill.github_stars / 1000).toFixed(1)))}</span>
                <span>{t.featured.downloads.replace('{count}', String((skill.downloads / 1000).toFixed(1)))}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Essay */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <article className="prose prose-lg max-w-none">
          <h1 className="font-display text-4xl font-bold mb-12 text-center">{t.essay.title}</h1>

          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold mb-4">{t.essay.sections.problem.title}</h2>
            <p className="whitespace-pre-line leading-relaxed">{t.essay.sections.problem.content}</p>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold mb-4">{t.essay.sections.protocol.title}</h2>
            <p className="whitespace-pre-line leading-relaxed">{t.essay.sections.protocol.content}</p>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold mb-4">{t.essay.sections.humanAgent.title}</h2>
            <p className="whitespace-pre-line leading-relaxed">{t.essay.sections.humanAgent.content}</p>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold mb-4">{t.essay.sections.commons.title}</h2>
            <p className="whitespace-pre-line leading-relaxed">{t.essay.sections.commons.content}</p>
          </section>
        </article>
      </section>

      {/* How It Works */}
      <section className="border-y border-border bg-muted py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-display text-3xl font-semibold mb-12 text-center">{t.howItWorks.title}</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-semibold text-xl mb-4">{t.howItWorks.forDevelopers.title}</h3>
              <ol className="space-y-3">
                {t.howItWorks.forDevelopers.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary">
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-xl mb-4">{t.howItWorks.forAgents.title}</h3>
              <ol className="space-y-3">
                {t.howItWorks.forAgents.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary">
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-xl mb-4">{t.howItWorks.forEveryone.title}</h3>
              <p className="text-sm text-secondary">{t.howItWorks.forEveryone.content}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-2xl font-display mb-8 leading-relaxed">{t.finalCta.message}</p>
        <Link
          href="/submit"
          className="inline-block px-8 py-4 bg-foreground text-background font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          {t.finalCta.button}
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-secondary">
          <p>© 2026 Open Agent Skill. Open protocol, open data, open code.</p>
        </div>
      </footer>
    </div>
  )
}
