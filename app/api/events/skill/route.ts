import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase/public'
import { getCanonicalSkillSlug } from '@/lib/skill-slug-aliases'

const EventSchema = z.object({
  skill_slug: z.string().min(1).max(200),
  event_type: z.enum([
    'view',
    'resolve_request',
    'install_copy',
    'install_start',
    'save',
    'compare',
    'outbound_github',
    'outbound_docs',
    'claim_start',
    'claim_submit',
    'share_copy',
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

  try {
    // Remain an anonymous, RLS-checked writer. Telemetry must neither hang nor
    // share a failure circuit with content reads, and writes are never retried.
    const supabase = createPublicClient({ requestTimeoutMs: 3000, circuitScope: 'telemetry' })
    const { error } = await supabase.from('skill_events').insert({
      skill_slug: getCanonicalSkillSlug(parsed.data.skill_slug),
      event_type: parsed.data.event_type,
      session_id: parsed.data.session_id || null,
      path: parsed.data.path || null,
      referrer: parsed.data.referrer || null,
      metadata: parsed.data.metadata || {},
      source: 'web',
      is_verified: false,
    })

    if (error?.code === '42501' || error?.code === '23503') {
      return NextResponse.json({ ok: false, error: 'Skill is not available for public events' }, { status: 404 })
    }
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[skill-event] Failed to record event:', error)
    return NextResponse.json({ ok: false, error: 'Failed to record event' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' },
    })
  }
}
