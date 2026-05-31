import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ClaimSchema = z.object({
  skill_slug: z.string().min(1).max(200),
  github_username: z.string().min(1).max(39).regex(/^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/i),
  repo_url: z.string().url().nullable().optional(),
  verification_method: z.enum(['github_profile', 'repository_issue', 'website_link', 'manual']).default('github_profile'),
  evidence_url: z.string().url().nullable().optional(),
  evidence_note: z.string().max(2000).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const skillSlug = request.nextUrl.searchParams.get('skill_slug')
  if (!skillSlug) return NextResponse.json({ error: 'Missing skill_slug' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('skill_claims')
    .select('id, skill_slug, github_username, evidence_url, evidence_note, verification_method, status, created_at, updated_at')
    .eq('skill_slug', skillSlug)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to load claim', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ claim: data || null })
}

export async function POST(request: NextRequest) {
  const parsed = ClaimSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid claim payload' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.email?.split('@')[0] || parsed.data.github_username,
  })

  if (profileError) {
    return NextResponse.json({ error: 'Failed to prepare profile', details: profileError.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('skill_claims')
    .upsert({
      skill_slug: parsed.data.skill_slug,
      user_id: user.id,
      github_username: parsed.data.github_username.toLowerCase(),
      repo_url: parsed.data.repo_url || null,
      verification_method: parsed.data.verification_method,
      evidence_url: parsed.data.evidence_url || null,
      evidence_note: parsed.data.evidence_note || null,
      status: 'pending',
      metadata: {
        source: 'skill_detail_page',
      },
    }, {
      onConflict: 'skill_slug,user_id',
    })
    .select('id, skill_slug, github_username, evidence_url, evidence_note, verification_method, status, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to submit claim', details: error.message }, { status: 500 })
  }

  await supabase.from('skill_events').insert({
    skill_slug: parsed.data.skill_slug,
    event_type: 'claim_submit',
    user_id: user.id,
    path: `/skills/${parsed.data.skill_slug}`,
    metadata: { source: 'claim_api' },
  })

  return NextResponse.json({ ok: true, claim: data })
}
