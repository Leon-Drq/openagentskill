'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { ActivityFeed } from './activity-feed'
import { LanguageSwitcher } from './language-switcher'

interface ActivityPageClientProps {
  activities: Array<{
    id: string
    event_type: string
    actor_name: string
    actor_type: string
    description: string
    created_at: string
  }>
}

export function ActivityPageClient({ activities }: ActivityPageClientProps) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                O
              </span>
              <span className="font-display text-base sm:text-lg lg:text-xl font-semibold">
                Open Agent Skill
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden sm:flex gap-1">
              <Link
                href="/"
                className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
              >
                {t.nav.home}
              </Link>
              <Link
                href="/skills"
                className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
              >
                {t.nav.skills}
              </Link>
              <Link
                href="/submit"
                className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
              >
                {t.nav.submit}
              </Link>
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <header className="mb-6 sm:mb-8 md:mb-10">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
            {t.activityPage.title}
          </h1>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">{t.activityPage.subtitle}</p>
        </header>

        {/* Filter Info */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8 text-xs font-mono text-secondary">
          <span className="px-2 py-1 border border-border">{t.activityPage.filters.all}</span>
          <span className="px-2 py-1 border border-border hover:bg-muted cursor-pointer transition-colors">
            {t.activityPage.filters.human}
          </span>
          <span className="px-2 py-1 border border-border hover:bg-muted cursor-pointer transition-colors">
            {t.activityPage.filters.agent}
          </span>
        </div>

        {/* Feed */}
        <div className="border border-border p-4 sm:p-6 bg-card">
          <ActivityFeed activities={activities} />
        </div>

        {/* API Note */}
        <div className="mt-6 sm:mt-8 text-xs font-mono text-secondary border border-border p-4 bg-card">
          <p className="mb-2 font-semibold">{t.activityPage.programmaticAccess}</p>
          <p>
            {'GET '}
            <code className="bg-muted px-1 py-0.5">{'/api/activity?limit=20'}</code>
            {' — '}
            {t.activityPage.apiNote}
          </p>
        </div>
      </main>
    </div>
  )
}
