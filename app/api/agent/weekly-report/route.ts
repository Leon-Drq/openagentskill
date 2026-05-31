import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, getSkillEventStatsMap } from '@/lib/db/skills'
import { buildWeeklySkillReport, formatReportSkillLine } from '@/lib/reports'

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json'
  const [skills, eventStatsMap] = await Promise.all([
    getAllSkills('quality'),
    getSkillEventStatsMap(),
  ])
  const report = buildWeeklySkillReport(skills, eventStatsMap)

  if (format === 'text') {
    const text = [
      'OpenAgentSkill Weekly Report',
      `Generated: ${report.generatedAt}`,
      '',
      'Editor picks:',
      ...report.editorPicks.slice(0, 8).map((skill, index) => `${index + 1}. ${formatReportSkillLine(skill)}`),
      '',
      'New this week:',
      ...(report.newSkills.length
        ? report.newSkills.slice(0, 8).map((skill, index) => `${index + 1}. ${formatReportSkillLine(skill)}`)
        : ['No new skills in the current weekly window.']),
    ].join('\n')

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return NextResponse.json({
    generated_at: report.generatedAt,
    window_days: report.windowDays,
    editor_picks: report.editorPicks.map((skill) => ({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      stars: skill.github_stars,
      quality_score: skill.quality_score,
      url: `https://www.openagentskill.com/skills/${skill.slug}`,
    })),
    new_skills: report.newSkills.map((skill) => ({
      slug: skill.slug,
      name: skill.name,
      stars: skill.github_stars,
      url: `https://www.openagentskill.com/skills/${skill.slug}`,
    })),
    recently_updated: report.recentlyUpdated.map((skill) => ({
      slug: skill.slug,
      name: skill.name,
      last_pushed_at: skill.github_last_pushed_at,
      url: `https://www.openagentskill.com/skills/${skill.slug}`,
    })),
  })
}
