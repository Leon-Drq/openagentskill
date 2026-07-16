import { NextResponse } from 'next/server'
import { getStateOfAgentSkillsReport } from '@/lib/research/state-of-agent-skills'

// This report is database-backed and can be slow on a cold connection. Generate it
// at request time so a reporting query never blocks the production build.
export const dynamic = 'force-dynamic'
export const revalidate = 3_600

export async function GET() {
  const report = await getStateOfAgentSkillsReport()
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
