import { NextRequest, NextResponse } from 'next/server'
import { syncFinanceResearchSkills } from '@/lib/indexer/finance-research-skills'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 300

async function handleSync(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncFinanceResearchSkills()
    console.info('[finance-research-skills] sync complete', {
      verified: result.verified,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Finance research skill sync failed'
    console.error('[finance-research-skills] sync failed', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}
