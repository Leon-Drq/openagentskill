import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { generateDailyRankingSnapshots } from '@/lib/ranking-snapshots'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 120

async function runDailyRankings(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  try {
    const result = await generateDailyRankingSnapshots()

    revalidateTag('ranking-snapshots', 'max')
    revalidatePath('/')
    revalidatePath('/rankings')
    revalidatePath('/rankings/[slug]', 'page')
    revalidatePath('/trending')
    revalidatePath('/hot')
    revalidatePath('/api/agent/rankings')

    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - startedAt,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[rankings-daily] Generation failed:', message)
    return NextResponse.json(
      {
        ok: false,
        duration_ms: Date.now() - startedAt,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return runDailyRankings(request)
}

export async function POST(request: NextRequest) {
  return runDailyRankings(request)
}
