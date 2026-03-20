import { Metadata } from 'next'
import { getRecentActivity } from '@/lib/db/activity'
import { ActivityPageClient } from '@/components/activity-page-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activity Feed - Latest Skill Updates',
  description: 'Real-time activity from Open Agent Skill. See new skills, trending tools, and what agents are using right now.',
  openGraph: {
    title: 'Activity Feed — Open Agent Skill',
    description: 'Real-time activity from Open Agent Skill. New skills, trending tools, and agent usage.',
    type: 'website',
    url: 'https://www.openagentskill.com/activity',
  },
  alternates: {
    canonical: 'https://www.openagentskill.com/activity',
  },
}

export default async function ActivityPage() {
  let activities: Awaited<ReturnType<typeof getRecentActivity>> = []

  try {
    activities = await getRecentActivity(50)
  } catch (error) {
    // Silently fail — will show empty state
  }

  return <ActivityPageClient activities={activities} />
}
