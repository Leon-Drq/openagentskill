import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readAccountPoints } from '@/lib/account-points'

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: privateHeaders })
  }

  const [total, { data: events, error }] = await Promise.all([readAccountPoints(supabase, user.id), supabase
    .from('point_events')
    .select('id,amount,event_type,description,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50).abortSignal(AbortSignal.timeout(8000))])
  if (total === null || error) return NextResponse.json({ error: 'points_unavailable' }, { status: 503, headers: privateHeaders })
  return NextResponse.json({ total, events: events || [] }, { headers: privateHeaders })
}

export const POINT_REWARDS: Record<string, { amount: number; description: string }> = {
  skill_published:   { amount: 500,  description: 'Published a new skill' },
  skill_installed:   { amount: 10,   description: 'Your skill was installed' },
  skill_starred:     { amount: 5,    description: 'Your skill was starred on GitHub' },
  review_submitted:  { amount: 50,   description: 'Submitted a skill review' },
  invite_accepted:   { amount: 200,  description: 'Invited a new member' },
  daily_login:       { amount: 5,    description: 'Daily login bonus' },
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { event_type, ref_id } = body

  const reward = POINT_REWARDS[event_type]
  if (!reward) {
    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('point_events')
    .insert({
      user_id: user.id,
      amount: reward.amount,
      event_type,
      description: reward.description,
      ref_id: ref_id || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event: data, reward })
}
