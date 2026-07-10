import { getStateOfAgentSkillsReport, renderStateOfAgentSkillsCsv } from '@/lib/research/state-of-agent-skills'

export const revalidate = 3_600

export async function GET() {
  const report = await getStateOfAgentSkillsReport()
  return new Response(renderStateOfAgentSkillsCsv(report), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="state-of-agent-skills-2026.csv"',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
