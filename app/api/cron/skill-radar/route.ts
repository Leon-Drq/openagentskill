import { NextRequest, NextResponse } from 'next/server'
import { runSkillRadarAutomation } from '@/lib/growth/skill-radar'
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

function parseOptionalBoolean(searchValue: string | null, bodyValue: unknown) {
  if (searchValue === 'true' || searchValue === '1') return true
  if (searchValue === 'false' || searchValue === '0') return false
  if (bodyValue === true || bodyValue === false) return bodyValue
  return undefined
}

async function handleRun(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const searchParams = request.nextUrl.searchParams
  const options = {
    targetNew: parseOptionalPositive(searchParams.get('targetNew'), body.targetNew),
    minStars: parseOptionalPositive(searchParams.get('minStars'), body.minStars),
    githubLimit: parseOptionalPositive(searchParams.get('githubLimit'), body.githubLimit),
    githubLookbackDays: parseOptionalPositive(searchParams.get('githubLookbackDays'), body.githubLookbackDays),
    githubMaxQueries: parseOptionalPositive(searchParams.get('githubMaxQueries'), body.githubMaxQueries),
    xLimit: parseOptionalPositive(searchParams.get('xLimit'), body.xLimit),
    xMaxQueries: parseOptionalNonNegative(searchParams.get('xMaxQueries'), body.xMaxQueries),
    xResultsPerQuery: parseOptionalPositive(searchParams.get('xResultsPerQuery'), body.xResultsPerQuery),
    seoPerRun: parseOptionalNonNegative(searchParams.get('seoPerRun'), body.seoPerRun),
    seoDailyLimit: parseOptionalPositive(searchParams.get('seoDailyLimit'), body.seoDailyLimit),
    xQueueLimit: parseOptionalPositive(searchParams.get('xQueueLimit'), body.xQueueLimit),
    xMinStars: parseOptionalPositive(searchParams.get('xMinStars'), body.xMinStars),
    autoPost: parseOptionalBoolean(searchParams.get('autoPost'), body.autoPost),
  }

  console.info('[skill-radar] start', {
    targetNew: options.targetNew ?? 'default',
    minStars: options.minStars ?? 'default',
    githubMaxQueries: options.githubMaxQueries ?? 'default',
    xMaxQueries: options.xMaxQueries ?? 'default',
  })
  const result = await runSkillRadarAutomation(options)
  console.info('[skill-radar] complete', {
    candidates: result.githubHot.candidates.length,
    reviewed: result.import.summary.found,
    indexed: result.import.summary.indexed,
    rejected: result.import.summary.rejected,
    skipped: result.import.summary.skipped,
    errors: result.import.summary.errors,
  })

  return NextResponse.json(result)
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
