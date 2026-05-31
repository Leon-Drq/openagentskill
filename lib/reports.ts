import type { SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'

export interface WeeklySkillReport {
  generatedAt: string
  windowDays: number
  newSkills: SkillRecord[]
  recentlyUpdated: SkillRecord[]
  mostViewed: Array<{ skill: SkillRecord; stats: SkillEventStats }>
  mostInstalled: Array<{ skill: SkillRecord; stats: SkillEventStats }>
  editorPicks: SkillRecord[]
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function withinDays(value: string | null | undefined, days: number) {
  const timestamp = dateValue(value)
  return timestamp > 0 && Date.now() - timestamp <= days * 86_400_000
}

export function buildWeeklySkillReport(
  skills: SkillRecord[],
  eventStatsMap: Record<string, SkillEventStats> = {},
  windowDays = 7
): WeeklySkillReport {
  const newSkills = skills
    .filter((skill) => withinDays(skill.created_at, windowDays))
    .sort((a, b) => dateValue(b.created_at) - dateValue(a.created_at))
    .slice(0, 20)

  const recentlyUpdated = skills
    .filter((skill) => withinDays(skill.github_last_pushed_at || skill.updated_at, windowDays))
    .sort((a, b) => dateValue(b.github_last_pushed_at || b.updated_at) - dateValue(a.github_last_pushed_at || a.updated_at))
    .slice(0, 20)

  const statsRows = Object.values(eventStatsMap)
    .map((stats) => ({
      stats,
      skill: skills.find((skill) => skill.slug === stats.skill_slug),
    }))
    .filter((item): item is { stats: SkillEventStats; skill: SkillRecord } => Boolean(item.skill))

  const mostViewed = [...statsRows]
    .sort((a, b) => b.stats.views - a.stats.views)
    .slice(0, 12)

  const mostInstalled = [...statsRows]
    .sort((a, b) => b.stats.install_copies - a.stats.install_copies)
    .slice(0, 12)

  const editorPicks = skills
    .filter((skill) => Number(skill.github_stars || 0) >= 500)
    .sort((a, b) => getSkillQualityProfile(b).score - getSkillQualityProfile(a).score || b.github_stars - a.github_stars)
    .slice(0, 12)

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    newSkills,
    recentlyUpdated,
    mostViewed,
    mostInstalled,
    editorPicks,
  }
}

export function formatReportSkillLine(skill: SkillRecord, suffix?: string) {
  const quality = getSkillQualityProfile(skill)
  return `${skill.name} (${skill.slug}) - ${formatCompactNumber(skill.github_stars || 0)} stars, ${quality.label} ${quality.score}/100${suffix ? `, ${suffix}` : ''}`
}
