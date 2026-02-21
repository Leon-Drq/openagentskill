import type { ActivityRecord } from '@/lib/db/activity'

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getEventIcon(eventType: string, actorType: string): string {
  if (actorType === 'agent') return '>'
  if (eventType === 'milestone') return '*'
  if (eventType === 'skill_published') return '+'
  if (eventType === 'agent_submitted') return '>'
  return '~'
}

export function ActivityFeed({ activities }: { activities: ActivityRecord[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-sm text-secondary font-mono text-center py-8">
        {'No activity yet.'}
      </div>
    )
  }

  return (
    <div className="font-mono text-sm divide-y divide-border">
      {activities.map((activity) => (
        <div key={activity.id} className="py-3 flex gap-3 items-start">
          <span className="text-secondary shrink-0 w-16 text-xs text-right pt-0.5">
            {timeAgo(activity.created_at)}
          </span>
          <span className="text-secondary shrink-0 w-4 text-center pt-0.5">
            {getEventIcon(activity.event_type, activity.actor_type)}
          </span>
          <div className="flex-1 min-w-0">
            <span className={activity.actor_type === 'agent' ? 'text-secondary italic' : 'font-semibold'}>
              {activity.actor_name}
            </span>
            {' '}
            <span className="text-secondary">
              {activity.description}
            </span>
          </div>
          {activity.actor_type === 'agent' && (
            <span className="shrink-0 text-xs text-secondary border border-border px-1.5 py-0.5">
              AGENT
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
