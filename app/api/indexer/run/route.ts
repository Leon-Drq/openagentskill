import { NextRequest, NextResponse } from 'next/server'
import { searchSkillRepos, filterNewRepos, fetchExistingSlugs } from '@/lib/indexer/github-search'
import { processBatch } from '@/lib/indexer/processor'

// Allow up to 5 minutes for the indexer to run (Vercel max for Pro plan)
export const maxDuration = 300

/**
 * POST /api/indexer/run
 *
 * Triggers the Skill Auto-Indexer. Protected by INDEXER_SECRET.
 * Called automatically by Vercel Cron, or manually for testing.
 *
 * Body (optional):
 *   { page?: number, limit?: number }
 *
 * Headers:
 *   Authorization: Bearer <INDEXER_SECRET>
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const indexerSecret = process.env.INDEXER_SECRET
  const cronSecret = process.env.CRON_SECRET // Vercel injects this automatically

  // No secret configured — allow all (dev mode)
  if (!indexerSecret && !cronSecret) return true

  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')

  return (!!indexerSecret && token === indexerSecret) ||
         (!!cronSecret && token === cronSecret)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const page = Number(body.page) || 1
    const limit = Math.min(Number(body.limit) || 20, 30)

    console.log(`[indexer] Starting run — page=${page}, limit=${limit}`)

    // 1. Search GitHub for repos with SKILL.md
    const candidates = await searchSkillRepos(page, limit)
    console.log(`[indexer] Found ${candidates.length} candidates`)

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { found: 0, new: 0, indexed: 0, rejected: 0, errors: 0 },
        results: [],
      })
    }

    // 2. Filter out already-indexed repos
    const existingSlugs = await fetchExistingSlugs()
    const newCandidates = await filterNewRepos(candidates, existingSlugs)
    console.log(`[indexer] ${newCandidates.length} new repos to process (${candidates.length - newCandidates.length} already indexed)`)

    if (newCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { found: candidates.length, new: 0, indexed: 0, rejected: 0, errors: 0 },
        results: [],
        message: 'All found repos are already indexed',
      })
    }

    // 3. Process batch (runs full pipeline: validate → analyze → AI review → save)
    const results = await processBatch(newCandidates, 2)

    // 4. Summarize
    const summary = {
      found: candidates.length,
      new: newCandidates.length,
      indexed: results.filter((r) => r.status === 'indexed').length,
      rejected: results.filter((r) => r.status === 'rejected').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
    }

    console.log('[indexer] Run complete:', summary)

    return NextResponse.json({ success: true, summary, results })
  } catch (error: any) {
    console.error('[indexer] Fatal error:', error)
    return NextResponse.json(
      { error: 'Indexer run failed', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/indexer/run
 * Health check — also called by Vercel Cron (GET).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delegate to POST logic with default params
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ page: 1, limit: 20 }),
    })
  )
}
