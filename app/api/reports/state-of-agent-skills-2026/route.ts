import { NextRequest, NextResponse } from 'next/server'
import {
  getStateOfAgentSkillsReport,
  renderStateOfAgentSkillsCsv,
  renderStateOfAgentSkillsText,
} from '@/lib/research/state-of-agent-skills'

// This report is database-backed and can be slow on a cold connection. Generate it
// at request time so a reporting query never blocks the production build.
export const dynamic = 'force-dynamic'
export const revalidate = 3_600

export async function GET(request: NextRequest) {
  const report = await getStateOfAgentSkillsReport()
  const format = (request.nextUrl.searchParams.get('format') || 'json').toLowerCase()
  const cacheControl = 'public, max-age=3600, stale-while-revalidate=86400'

  if (format === 'csv') {
    return new Response(renderStateOfAgentSkillsCsv(report), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'inline; filename="state-of-agent-skills-2026.csv"',
        'Cache-Control': cacheControl,
      },
    })
  }

  if (format === 'text' || format === 'txt') {
    return new Response(renderStateOfAgentSkillsText(report), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': cacheControl,
      },
    })
  }

  return NextResponse.json(report, {
    headers: {
      'Cache-Control': cacheControl,
    },
  })
}
