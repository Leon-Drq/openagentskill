import { NextRequest, NextResponse } from 'next/server'
import {
  getStateOfAgentSkillsReport,
  renderStateOfAgentSkillsCsv,
  renderStateOfAgentSkillsText,
} from '@/lib/research/state-of-agent-skills'

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
