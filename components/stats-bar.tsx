function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

interface StatsBarProps {
  totalSkills: number
  totalDownloads: number
  totalPlatforms: number
  agentSubmissions: number
}

export function StatsBar({ totalSkills, totalDownloads, totalPlatforms, agentSubmissions }: StatsBarProps) {
  const stats = [
    { label: 'Skills', value: totalSkills.toString() },
    { label: 'Downloads', value: `${formatNumber(totalDownloads)}+` },
    { label: 'Platforms', value: totalPlatforms.toString() },
    { label: 'Agent Contributions', value: agentSubmissions.toString() },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border border-y border-border">
      {stats.map((stat) => (
        <div key={stat.label} className="py-4 sm:py-6 text-center">
          <div className="font-display text-2xl sm:text-3xl font-bold mb-1">
            {stat.value}
          </div>
          <div className="text-xs sm:text-sm font-mono text-secondary uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
