import { getStateOfAgentSkillsReport, renderStateOfAgentSkillsText } from '@/lib/research/state-of-agent-skills'

export const revalidate = 3_600

export async function GET() {
  const report = await getStateOfAgentSkillsReport()
  return new Response(renderStateOfAgentSkillsText(report), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
