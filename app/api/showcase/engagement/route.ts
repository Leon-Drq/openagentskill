import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getShowcaseCase, SHOWCASE_CASES } from '@/lib/showcase'
import type { ShowcaseStats } from '@/lib/showcase-engagement'

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })

async function counts(slugs: string[]) {
  const { data, error } = await createAdminClient({ requestTimeoutMs: 8000 })
    .rpc('showcase_vote_counts', { case_slugs: slugs })
  if (error) throw error
  return data as { case_slug: string; likes: number; dislikes: number }[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const [{ data: { user }, error: authError }, totals] = await Promise.all([
      supabase.auth.getUser(), counts(SHOWCASE_CASES.map((item) => item.slug)),
    ])
    if (authError && authError.name !== 'AuthSessionMissingError' && authError.status !== 401) throw authError
    const signedIn = Boolean(user && !user.is_anonymous)
    const votes = new Map<string, 1 | -1>()
    if (signedIn && user) {
      const { data, error } = await supabase.from('showcase_votes').select('case_slug,vote').eq('user_id', user.id)
      if (error) throw error
      data.forEach((row) => votes.set(row.case_slug, row.vote))
    }
    const stats: ShowcaseStats = Object.fromEntries(SHOWCASE_CASES.map((item) => [item.slug, { likes: 0, dislikes: 0, vote: votes.get(item.slug) ?? null }]))
    totals.forEach((row) => { if (stats[row.case_slug]) { stats[row.case_slug].likes = Number(row.likes); stats[row.case_slug].dislikes = Number(row.dislikes) } })
    return json({ signedIn, stats })
  } catch {
    return json({ error: 'engagement_unavailable' }, 503)
  }
}

export async function PUT(request: NextRequest) {
  // Cookie-authenticated writes must originate on this site. No cross-origin voting.
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'invalid_origin' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'invalid_body' }, 415)
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 1024) return json({ error: 'invalid_body' }, 413)
    body = JSON.parse(raw)
  } catch { return json({ error: 'invalid_body' }, 400) }
  if (!body || typeof body !== 'object' || !('slug' in body) || typeof body.slug !== 'string'
    || !getShowcaseCase(body.slug) || !('vote' in body) || (body.vote !== 1 && body.vote !== -1 && body.vote !== null)) {
    return json({ error: 'invalid_case_or_vote' }, 400)
  }
  const { slug, vote } = body
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error && error.name !== 'AuthSessionMissingError' && error.status !== 401) throw error
    if (!user || user.is_anonymous) return json({ error: 'sign_in_required' }, 401)
    // Unique (user_id, case_slug) makes retries idempotent; writes retain the user's RLS.
    const result = await supabase.rpc('set_showcase_vote', { target_slug: slug, direction: vote })
    if (result.error) throw result.error
    const totals = await counts([slug])
    return json({ slug, vote, likes: Number(totals[0]?.likes ?? 0), dislikes: Number(totals[0]?.dislikes ?? 0) })
  } catch {
    return json({ error: 'engagement_unavailable' }, 503)
  }
}
