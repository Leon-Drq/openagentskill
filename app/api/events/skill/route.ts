import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase/public'

const EventSchema = z.object({
  skill_slug: z.string().min(1).max(200),
  event_type: z.enum([
    'view',
    'install_copy',
    'save',
    'compare',
    'outbound_github',
    'outbound_docs',
    'claim_start',
    'claim_submit',
  ]),
  session_id: z.string().max(200).nullable().optional(),
  path: z.string().max(500).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  const parsed = EventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 })
  }

  const supabase = createPublicClient()
  const { error } = await supabase.from('skill_events').insert({
    skill_slug: parsed.data.skill_slug,
    event_type: parsed.data.event_type,
    session_id: parsed.data.session_id || null,
    path: parsed.data.path || null,
    referrer: parsed.data.referrer || null,
    metadata: parsed.data.metadata || {},
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to record event', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
