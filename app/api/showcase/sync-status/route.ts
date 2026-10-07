import { NextResponse } from 'next/server'
import status from '@/lib/showcase-sync.json'
import { SHOWCASE_CASES } from '@/lib/showcase'
import mediaStatus from '@/lib/skill-media-sync.json'
import previews from '@/lib/skill-previews-auto.json'

export function GET() {
  return NextResponse.json({
    checkedAt: status.checkedAt, updatedAt: status.updatedAt,
    cases: SHOWCASE_CASES.length, sources: status.sources.length,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    media: { checkedAt: mediaStatus.checkedAt, collectedSkills: previews.length,
      ...('summary' in mediaStatus ? { summary: mediaStatus.summary } : {}) },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
