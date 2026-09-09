import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { submissionTokenMatches } from '@/lib/skills/open-submission'
import { submissionJobEligible } from '@/lib/skills/submission-contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IdSchema = z.string().uuid()
const TokenSchema = z.string().regex(/^[a-f0-9]{48}$/)
const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || request.nextUrl.searchParams.get('token') || ''
  if (!IdSchema.safeParse(id).success || !TokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: 'Invalid submission receipt.' }, { status: 400, headers: privateHeaders })
  }

  try {
  const supabase = createAdminClient({ requestTimeoutMs: 8_000 })
  const { data, error } = await supabase
    .from('skill_submissions')
    .select(`
      id,
      status,
      skill_name,
      skill_description,
      skill_path,
      repository_url,
      identity_verified,
      ai_review_result,
      created_at,
      updated_at,
      reviewed_at,
      review_started_at,
      validation_result,
      status_token_hash,
      skills ( slug, ai_review_approved, listing_status )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Unable to read submission status.' }, { status: 503, headers: privateHeaders })
  }
  if (!data || !data.status_token_hash || !submissionTokenMatches(token, data.status_token_hash)) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404, headers: privateHeaders })
  }

  const review = data.ai_review_result && typeof data.ai_review_result === 'object'
    ? data.ai_review_result as Record<string, unknown>
    : {}
  const relatedSkill = Array.isArray(data.skills) ? data.skills[0] : data.skills
  const publicSkill = relatedSkill && (relatedSkill.ai_review_approved === true || ['owner_published', 'static_checked'].includes(relatedSkill.listing_status))

  return NextResponse.json({
    submission: {
      id: data.id,
      status: data.status,
      skill: {
        name: data.skill_name,
        description: data.skill_description,
        path: data.skill_path,
        sourceUrl: data.repository_url,
        slug: publicSkill ? relatedSkill.slug : null,
      },
      identityVerified: Boolean(data.identity_verified),
      queue: {
        attempts: Number(data.validation_result?.queue?.attempts) || 0,
        stalled: data.status === 'processing' && submissionJobEligible(data),
      },
      review: {
        method: typeof review.method === 'string' ? review.method : 'legacy_unclassified',
        approved: review.approved === true,
        policyVersion: typeof review.policyVersion === 'string' ? review.policyVersion : null,
        packageFingerprint: typeof review.packageFingerprint === 'string' ? review.packageFingerprint : null,
        scores: review.scores || null,
        totalScore: review.totalScore || null,
        issues: Array.isArray(review.issues) ? review.issues.slice(0, 20) : [],
        suggestions: Array.isArray(review.suggestions) ? review.suggestions.slice(0, 20) : [],
        reasoning: typeof review.reasoning === 'string' ? review.reasoning : null,
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      reviewedAt: data.reviewed_at,
    },
  }, { headers: privateHeaders })
  } catch {
    return NextResponse.json({ error: 'Unable to read submission status.' }, { status: 503, headers: privateHeaders })
  }
}
