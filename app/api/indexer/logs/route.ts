import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

function clampLimit(value: string | null) {
  const parsed = Number(value || 20)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 20, 1), 100)
}

export async function GET(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) {
    return NextResponse.json({ error: 'Missing INDEXER_SECRET' }, { status: 500 })
  }

  const limit = clampLimit(request.nextUrl.searchParams.get('limit'))
  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('list_indexer_runs', {
    p_server_secret: serverSecret,
    p_limit: limit,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to load indexer logs', details: error.message }, { status: 500 })
  }

  return NextResponse.json({
    runs: data || [],
    meta: {
      limit,
      filter_mode: 'skills-only',
    },
  })
}
