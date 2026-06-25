import { NextRequest, NextResponse } from 'next/server'
import { runSeoDrip } from '@/lib/growth/seo-drip'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 300

function parseOptionalPositive(searchValue: string | null, bodyValue: unknown) {
  const searchParsed = Number(searchValue)
  if (Number.isFinite(searchParsed) && searchParsed > 0) return searchParsed

  const bodyParsed = Number(bodyValue)
  if (Number.isFinite(bodyParsed) && bodyParsed > 0) return bodyParsed

  return undefined
}

async function handleRun(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const searchParams = request.nextUrl.searchParams
  const result = await runSeoDrip({
    perRun: parseOptionalPositive(searchParams.get('perRun'), body.perRun),
    dailyLimit: parseOptionalPositive(searchParams.get('dailyLimit'), body.dailyLimit),
    candidatePool: parseOptionalPositive(searchParams.get('candidatePool'), body.candidatePool),
  })

  return NextResponse.json({ success: result.status === 'generated', ...result })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
