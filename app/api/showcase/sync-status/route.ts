import { NextResponse } from 'next/server'
import status from '@/lib/showcase-sync.json'
import { SHOWCASE_CASES } from '@/lib/showcase'

export function GET() {
  return NextResponse.json({
    checkedAt: status.checkedAt, updatedAt: status.updatedAt,
    cases: SHOWCASE_CASES.length, sources: status.sources.length,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
