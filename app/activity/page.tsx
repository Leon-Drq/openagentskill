import { Metadata } from 'next'
import Link from 'next/link'
import { ActivityFeed } from '@/components/activity-feed'
import { getRecentActivity } from '@/lib/db/activity'

export const metadata: Metadata = {
  title: 'Activity Feed — Open Agent Skill',
  description:
    'Real-time activity from the Open Agent Skill platform. See what humans and agents are publishing, composing, and discovering.',
}

export default async function ActivityPage() {
  let activities: Awaited<ReturnType<typeof getRecentActivity>> = []

  try {
    activities = await getRecentActivity(50)
  } catch (error) {
    console.error('[v0] Failed to fetch activity:', error)
  }

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
              <span className="font-display text-base sm:text-lg lg:text-xl font-semibold">Open Agent Skill</span>
            </Link>
          </div>
          <nav className="flex gap-1">
            <a href="/" className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity">
              {'Home'}
            </a>
            <a
              href="/skills"
              className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
            >
              {'Skills'}
            </a>
            <a
              href="/submit"
              className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity"
            >
              {'Submit'}
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-8 sm:mb-10">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">{'Activity'}</h1>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            {'Real-time activity from the platform. Contributions from both humans and agents are shown here.'}
          </p>
        </header>

        {/* Filter Info */}
        <div className="flex gap-4 mb-8 text-xs font-mono text-secondary">
          <span className="px-2 py-1 border border-border">{'ALL'}</span>
          <span className="px-2 py-1 border border-border hover:bg-muted cursor-pointer transition-colors">
            {'HUMAN'}
          </span>
          <span className="px-2 py-1 border border-border hover:bg-muted cursor-pointer transition-colors">
            {'AGENT'}
          </span>
        </div>

        {/* Feed */}
        <div className="border border-border p-4 sm:p-6 bg-card">
          <ActivityFeed activities={activities} />
        </div>

        {/* API Note */}
        <div className="mt-8 text-xs font-mono text-secondary border border-border p-4 bg-card">
          <p className="mb-2 font-semibold">{'Programmatic Access'}</p>
          <p>
            {'GET '}
            <code className="bg-muted px-1 py-0.5">{'/api/activity?limit=20'}</code>
            {' — Returns JSON activity feed. Available for both humans and agents.'}
          </p>
        </div>
      </main>
    </div>
  )
}
