import { NextRequest, NextResponse } from 'next/server'
import { runDailyGrowthAutomation } from '@/lib/growth/daily'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 300

function parseOptionalPositive(searchValue: string | null, bodyValue: unknown) {
  const searchParsed = Number(searchValue)
  if (Number.isFinite(searchParsed) && searchParsed > 0) return searchParsed

  const bodyParsed = Number(bodyValue)
  if (Number.isFinite(bodyParsed) && bodyParsed > 0) return bodyParsed

  return undefined
}

function parseOptionalNonNegative(searchValue: string | null, bodyValue: unknown) {
  const searchParsed = Number(searchValue)
  if (Number.isFinite(searchParsed) && searchParsed >= 0) return searchParsed

  const bodyParsed = Number(bodyValue)
  if (Number.isFinite(bodyParsed) && bodyParsed >= 0) return bodyParsed

  return undefined
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback
  return value === 'true' || value === '1'
}

function parseOptionalBoolean(searchValue: string | null, bodyValue: unknown) {
  if (searchValue !== null) return parseBoolean(searchValue, true)
  if (bodyValue === undefined) return undefined
  if (typeof bodyValue === 'string') return bodyValue === 'true' || bodyValue === '1'
  return Boolean(bodyValue)
}

async function handleRun(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const searchParams = request.nextUrl.searchParams

  const result = await runDailyGrowthAutomation({
    targetNew: parseOptionalPositive(searchParams.get('targetNew'), body.targetNew),
    hotLimit: parseOptionalPositive(searchParams.get('hotLimit'), body.hotLimit),
    hotMinStars: parseOptionalPositive(searchParams.get('hotMinStars'), body.hotMinStars),
    hotLookbackDays: parseOptionalPositive(searchParams.get('hotLookbackDays'), body.hotLookbackDays),
    hotMaxQueries: parseOptionalPositive(searchParams.get('hotMaxQueries'), body.hotMaxQueries),
    bulkMinStars: parseOptionalPositive(searchParams.get('bulkMinStars'), body.bulkMinStars),
    bulkMaxSearchRequests: parseOptionalPositive(searchParams.get('bulkMaxSearchRequests'), body.bulkMaxSearchRequests),
    blogLimit: parseOptionalNonNegative(searchParams.get('blogLimit'), body.blogLimit),
    xQueueLimit: parseOptionalPositive(searchParams.get('xQueueLimit'), body.xQueueLimit),
    xMinStars: parseOptionalPositive(searchParams.get('xMinStars'), body.xMinStars),
    autoPost: parseOptionalBoolean(searchParams.get('autoPost'), body.autoPost),
  })

  return NextResponse.json(result)
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
