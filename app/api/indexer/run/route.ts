import { NextRequest, NextResponse } from 'next/server'
import { searchSkillRepos, type CandidateRepo } from '@/lib/indexer/github-search'
import { processBatch, processRepo } from '@/lib/indexer/processor'

// Allow up to 5 minutes (Vercel Pro max)
export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const indexerSecret = process.env.INDEXER_SECRET
  const cronSecret = process.env.CRON_SECRET

  // No secrets configured — allow all (useful for initial setup)
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
    const page = Math.max(1, Number(body.page) || 1)
    const limit = Math.min(Number(body.limit) || 20, 30)

    // Support direct URL injection: POST { "repoUrl": "https://github.com/owner/repo" }
    if (body.repoUrl) {
      const match = String(body.repoUrl).match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
      }
      const candidate: CandidateRepo = {
        owner: match[1], repo: match[2].replace(/\.git$/, ''),
        fullName: `${match[1]}/${match[2]}`,
        description: '', stars: 0, language: null,
        updatedAt: new Date().toISOString(), htmlUrl: body.repoUrl,
      }
      const result = await processRepo(candidate)
      return NextResponse.json({ success: true, summary: { found: 1, indexed: result.status === 'indexed' ? 1 : 0, rejected: result.status === 'rejected' ? 1 : 0, skipped: result.status === 'skipped' ? 1 : 0, errors: result.status === 'error' ? 1 : 0 }, results: [result] })
    }

    console.log(`[indexer] Starting — page=${page}, limit=${limit}`)

    // 1. Search GitHub
    const candidates = await searchSkillRepos(page, limit)
    console.log(`[indexer] Found ${candidates.length} candidates from GitHub`)

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, summary: { found: 0, indexed: 0, rejected: 0, skipped: 0, errors: 0 }, results: [] })
    }

    // 2. Process each repo (duplicate check is inside processRepo)
    const results = await processBatch(candidates, 2)

    const summary = {
      found: candidates.length,
      indexed: results.filter(r => r.status === 'indexed').length,
      rejected: results.filter(r => r.status === 'rejected').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
    }

    console.log('[indexer] Run complete:', summary)
    return NextResponse.json({ success: true, summary, results })

  } catch (error: any) {
    console.error('[indexer] Fatal error:', error)
    return NextResponse.json({ error: 'Indexer failed', details: error.message }, { status: 500 })
  }
}

// GET is called by Vercel Cron
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ page: 1, limit: 20 }),
  }))
}
