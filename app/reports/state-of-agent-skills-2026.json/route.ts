import { NextResponse } from 'next/server'
import { getStateOfAgentSkillsReport } from '@/lib/research/state-of-agent-skills'

export const revalidate = 3_600

export async function GET() {
  const report = await getStateOfAgentSkillsReport()
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
