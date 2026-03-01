import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: events } = await supabase
    .from('point_events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const total = (events || []).reduce((sum, e) => sum + e.amount, 0)

  return NextResponse.json({ total, events: events || [] })
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
