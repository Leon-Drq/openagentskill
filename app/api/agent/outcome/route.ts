import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AGENT_OUTCOMES } from '@/lib/agent-outcomes'
import { createPublicClient } from '@/lib/supabase/public'

const OutcomeSchema = z.object({
  event_id: z.string().min(1).max(200),
  skill_slug: z.string().min(1).max(200),
  task: z.string().min(1).max(2000),
  agent: z.string().min(1).max(120).default('auto'),
  outcome: z.enum(AGENT_OUTCOMES).default('success'),
  install_used: z.boolean().optional().default(false),
  risk_blocked: z.boolean().optional().default(false),
  setup_required: z.boolean().optional().default(false),
  time_to_useful_ms: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = OutcomeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid outcome payload',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const payload = parsed.data
    const supabase = createPublicClient()
    const { data, error } = await supabase.rpc('record_agent_outcome', {
      p_event_id: payload.event_id,
      p_skill_slug: payload.skill_slug,
      p_task: payload.task,
      p_agent: payload.agent,
      p_outcome: payload.outcome,
      p_install_used: payload.install_used,
      p_risk_blocked: payload.risk_blocked || payload.outcome === 'blocked_by_risk',
      p_setup_required: payload.setup_required || payload.outcome === 'setup_required',
      p_time_to_useful_ms: payload.time_to_useful_ms ?? null,
      p_notes: payload.notes ?? null,
      p_metadata: payload.metadata || {},
    })

    if (error) {
      console.error('[agent-outcome] RPC error:', error)
      return NextResponse.json({ error: 'Failed to record outcome' }, { status: 500 })
    }

    if (data?.error === 'skill_not_found') {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    if (data?.error === 'invalid_outcome') {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
    }

    const { data: stats } = await supabase
      .from('agent_outcome_stats')
      .select('*')
      .eq('skill_slug', payload.skill_slug)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      success: true,
      message: 'Agent outcome recorded',
      event_id: payload.event_id,
      skill_slug: payload.skill_slug,
      outcome: payload.outcome,
      stats: stats || null,
      data,
    })
  } catch (error) {
    console.error('[agent-outcome] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const skillSlug = request.nextUrl.searchParams.get('skill_slug')
  const supabase = createPublicClient()

  if (skillSlug) {
    const { data, error } = await supabase
      .from('agent_outcome_stats')
      .select('*')
      .eq('skill_slug', skillSlug)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({
        skill_slug: skillSlug,
        total_outcomes: 0,
        successful_outcomes: 0,
        failed_outcomes: 0,
        not_relevant_outcomes: 0,
        risk_blocked_outcomes: 0,
        setup_required_outcomes: 0,
        install_attempts: 0,
        success_rate: null,
        last_outcome_at: null,
      })
    }

    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('agent_outcome_stats')
    .select('*')
    .order('total_outcomes', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch outcome stats' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
