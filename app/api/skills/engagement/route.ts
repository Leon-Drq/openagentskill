import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/async'
import { normalizeEngagementSlugs, type SkillEngagementMap } from '@/lib/skill-engagement'

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
const mutation = z.union([
  z.object({ slug: z.string().min(1).max(200), vote: z.union([z.literal(1), z.literal(-1), z.null()]) }).strict(),
  z.object({ slug: z.string().min(1).max(200), saved: z.boolean() }).strict(),
])
async function counts(slugs: string[]) {
  const { data, error } = await createAdminClient({ requestTimeoutMs: 8000 }).rpc('skill_vote_counts', { skill_slugs: slugs })
  if (error) throw error
  return data as { skill_slug: string; likes: number; dislikes: number }[]
}
const publicCounts = unstable_cache(counts, ['skill-public-votes-v1'], { revalidate: 60, tags: ['public-skill-votes'] })

export async function GET(request: NextRequest) {
  const slugs = normalizeEngagementSlugs((request.nextUrl.searchParams.get('slugs') || '').split(','))
  if (!slugs) return json({ error: 'invalid_skills' }, 400)
  try {
    const supabase = await createClient()
    const [{ data: { user }, error: authError }, totals] = await Promise.all([
      withTimeout(supabase.auth.getUser(), 8000, 'skill engagement account'), publicCounts(slugs),
    ])
    if (authError && authError.name !== 'AuthSessionMissingError' && authError.status !== 401) throw authError
    const signedIn = Boolean(user && !user.is_anonymous)
    const stats: SkillEngagementMap = Object.fromEntries(totals.map(row => [row.skill_slug, {
      likes: Number(row.likes), dislikes: Number(row.dislikes), vote: null, saved: false,
    }]))
    if (signedIn && user && totals.length) {
      const visible = totals.map(row => row.skill_slug)
      const [votes, bookmarks] = await Promise.all([
        supabase.from('skill_votes').select('skill_slug,vote').eq('user_id', user.id).in('skill_slug', visible).abortSignal(AbortSignal.timeout(8000)),
        supabase.from('bookmarks').select('skill_slug').eq('user_id', user.id).in('skill_slug', visible).abortSignal(AbortSignal.timeout(8000)),
      ])
      if (votes.error) throw votes.error
      if (bookmarks.error) throw bookmarks.error
      votes.data.forEach(row => { if (stats[row.skill_slug]) stats[row.skill_slug].vote = row.vote })
      bookmarks.data.forEach(row => { if (stats[row.skill_slug]) stats[row.skill_slug].saved = true })
    }
    return json({ signedIn, stats })
  } catch { return json({ error: 'engagement_unavailable' }, 503) }
}

export async function PUT(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'invalid_origin' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'invalid_body' }, 415)
  let parsed
  try {
    const raw = await request.text()
    if (raw.length > 1024) return json({ error: 'invalid_body' }, 413)
    parsed = mutation.safeParse(JSON.parse(raw))
  } catch { return json({ error: 'invalid_body' }, 400) }
  if (!parsed.success) return json({ error: 'invalid_body' }, 400)
  const body = parsed.data
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await withTimeout(supabase.auth.getUser(), 8000, 'skill engagement account')
    if (error && error.name !== 'AuthSessionMissingError' && error.status !== 401) throw error
    if (!user || user.is_anonymous) return json({ error: 'sign_in_required' }, 401)
    const visible = await supabase.from('skills').select('slug').eq('slug', body.slug).abortSignal(AbortSignal.timeout(8000)).maybeSingle()
    if (visible.error) throw visible.error
    if (!visible.data) return json({ error: 'skill_not_found' }, 404)
    if ('vote' in body) {
      const result = await withTimeout(supabase.rpc('set_skill_vote', { target_slug: body.slug, direction: body.vote }), 8000, 'skill vote')
      if (result.error) throw result.error
      revalidateTag('public-skill-votes', { expire: 0 })
      const totals = await counts([body.slug])
      return json({ slug: body.slug, vote: body.vote, likes: Number(totals[0]?.likes ?? 0), dislikes: Number(totals[0]?.dislikes ?? 0) })
    }
    const result = body.saved
      ? await supabase.from('bookmarks').upsert({ user_id: user.id, skill_slug: body.slug }, { onConflict: 'user_id,skill_slug', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(8000))
      : await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('skill_slug', body.slug).abortSignal(AbortSignal.timeout(8000))
    if (result.error) throw result.error
    return json({ slug: body.slug, saved: body.saved })
  } catch { return json({ error: 'engagement_unavailable' }, 503) }
}
