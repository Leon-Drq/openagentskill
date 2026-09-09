import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { PUBLIC_SKILL_FILTER } from '@/lib/skills/publication'
import { getReviewEvidence } from '@/lib/skills/review-evidence'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

/** Exact public source identity lookup; never exposes pending/private submission data. */
export async function GET(request: NextRequest) {
  const repository = request.nextUrl.searchParams.get('repository') || ''
  const path = request.nextUrl.searchParams.get('path') || ''
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || path.length > 500 ||
    !/(^|\/)SKILL\.md$/i.test(path) || /[\x00-\x1f\\]/.test(path) || path.startsWith('/') || path.split('/').some(p => p === '..' || p === '.')) {
    return NextResponse.json({ error: 'Invalid repository or Skill path.' }, { status: 400, headers })
  }
  const { data, error } = await createPublicClient({ requestTimeoutMs: 8000 })
    .from('skills').select('slug,name,github_repo,source_path,source_commit_sha,listing_status,ai_review_score,publisher_verified,source_sync_status,license')
    .ilike('github_repo', repository.replace(/[\\%_]/g, '\\$&')).eq('source_path', path).or(PUBLIC_SKILL_FILTER).order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: 'Public source lookup unavailable.' }, { status: 503, headers })
  return NextResponse.json({ skill: data ? { name: data.name, slug: data.slug, repository: data.github_repo,
    path: data.source_path, commit: data.source_commit_sha, listingStatus: data.listing_status,
    license: data.license, reviewEvidence: getReviewEvidence(data), url: `https://www.openagentskill.com/skills/${data.slug}` } : null }, { headers })
}
