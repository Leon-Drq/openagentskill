'use client'

import { useI18n } from '@/lib/i18n/context'
import type { ActivityRecord } from '@/lib/db/activity'
import { ActivityFeed } from './activity-feed'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

interface ActivityPageClientProps {
  activities: ActivityRecord[]
}

export function ActivityPageClient({ activities }: ActivityPageClientProps) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

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
      <SiteFooter />
    </div>
  )
}
