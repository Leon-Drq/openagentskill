import { Metadata } from 'next'
import { getRecentActivity } from '@/lib/db/activity'
import { ActivityPageClient } from '@/components/activity-page-client'

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

  return <ActivityPageClient activities={activities} />
}
