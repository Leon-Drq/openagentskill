import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { submissionTokenMatches } from '@/lib/skills/open-submission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IdSchema = z.string().uuid()
const TokenSchema = z.string().regex(/^[a-f0-9]{48}$/)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get('token') || ''
  if (!IdSchema.safeParse(id).success || !TokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: 'Invalid submission receipt.' }, { status: 400 })
  }

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
      status_token_hash,
      skills ( slug )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Unable to read submission status.' }, { status: 500 })
  }
  if (!data || !data.status_token_hash || !submissionTokenMatches(token, data.status_token_hash)) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
  }

  const review = data.ai_review_result && typeof data.ai_review_result === 'object'
    ? data.ai_review_result as Record<string, unknown>
    : {}
  const relatedSkill = Array.isArray(data.skills) ? data.skills[0] : data.skills

  return NextResponse.json({
    submission: {
      id: data.id,
      status: data.status,
      skill: {
        name: data.skill_name,
        description: data.skill_description,
        path: data.skill_path,
        sourceUrl: data.repository_url,
        slug: relatedSkill?.slug || null,
      },
      identityVerified: Boolean(data.identity_verified),
      review: {
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
  })
}
