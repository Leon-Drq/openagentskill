import { getStateOfAgentSkillsReport, renderStateOfAgentSkillsCsv } from '@/lib/research/state-of-agent-skills'

// This report is database-backed and can be slow on a cold connection. Generate it
// at request time so a reporting query never blocks the production build.
export const dynamic = 'force-dynamic'
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
