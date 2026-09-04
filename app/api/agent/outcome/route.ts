import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  AGENT_OUTCOME_ERROR_TYPES,
  AGENT_OUTCOME_WORKSPACES,
  AGENT_OUTCOMES,
  AGENT_OUTCOME_PROTOCOL_VERSION,
  buildOutcomeMetadata,
  buildOutcomeTrustImpact,
} from '@/lib/agent-outcomes'
import {
  createEmptyOutcomeStats,
  formatOutcomeStatsText,
} from '@/lib/agent-outcome-summary'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'

const OutcomeSchema = z.object({
  event_id: z.string().min(1).max(200),
  skill_slug: z.string().min(1).max(200),
  task: z.string().min(1).max(2000),
  agent: z.string().min(1).max(120).default('auto'),
  outcome: z.enum(AGENT_OUTCOMES).default('success'),
  install_used: z.boolean().optional().default(false),
  risk_blocked: z.boolean().optional().default(false),
  setup_required: z.boolean().optional().default(false),
  task_success: z.boolean().nullable().optional(),
  output_quality: z.number().int().min(1).max(5).nullable().optional(),
  error_type: z.enum(AGENT_OUTCOME_ERROR_TYPES).nullable().optional(),
  human_review_required: z.boolean().optional().default(false),
  used_in_production: z.boolean().optional().default(false),
  workspace: z.enum(AGENT_OUTCOME_WORKSPACES).optional().default('unknown'),
  evidence_url: z.string().url().max(500).nullable().optional(),
  time_to_useful_ms: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
  source_version: z.object({
    version: z.string().max(50).nullable().optional(),
    commit_sha: z.string().regex(/^[a-f0-9]{7,64}$/i).nullable().optional(),
    content_hash: z.string().regex(/^[a-f0-9]{64}$/i).nullable().optional(),
    ref: z.string().max(255).nullable().optional(),
    path: z.string().max(1000).nullable().optional(),
    sync_status: z.string().max(50).nullable().optional(),
  }).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  dry_run: z.boolean().optional().default(false),
})

function buildOutcomeContract() {
  return {
    version: AGENT_OUTCOME_PROTOCOL_VERSION,
    endpoint: '/api/agent/outcome',
    method: 'POST',
    idempotency: 'event_id is unique. Retrying the same event_id updates the previous outcome.',
    required_fields: ['event_id', 'skill_slug', 'task'],
    event_id_sources: [
      'feedback.event_id from /api/agent/resolve',
      'install_receipt.resolve_event_id from /api/agent/receipt',
      'decision_packet.outcome_feedback.event_id from /api/agent/resolve',
    ],
    outcomes: AGENT_OUTCOMES,
    error_types: AGENT_OUTCOME_ERROR_TYPES,
    workspaces: AGENT_OUTCOME_WORKSPACES,
    quality_fields: {
      task_success: 'boolean; defaults from outcome === success when omitted',
      output_quality: 'integer 1-5 when the agent can judge answer quality',
      human_review_required: 'true when the run cannot be trusted without a human check',
      used_in_production: 'true only after a production workflow used the skill',
      evidence_url: 'optional URL to logs, PR, issue, or public artifact',
    },
    version_attribution: {
      field: 'source_version from the resolve/install receipt',
      verification: 'A supplied content hash must match the current skill or a recorded historical skill version.',
      aggregate_behavior: 'Version evidence is stored privately with the outcome while public pages expose aggregates.',
    },
    aggregate_fields: {
      agent_proven_score: '0-100 aggregate score from outcomes, success, recency, install attempts, quality, production use, and risk penalties',
      recent_success_rate: 'success rate for outcomes reported in the last 30 days',
      recent_failure_rate: 'failure-like outcomes reported in the last 30 days',
      install_success_rate: 'success rate among runs that used the install path',
      avg_output_quality: 'average reported output quality, 1-5',
    },
    ranking_impact: [
      'Updates Trust Score v5 outcome confidence',
      'Updates Trust Score v4 compatibility evidence',
      'Updates /rankings/agent-proven and /rankings/best-by-success-rate',
      'Changes /api/agent/resolve ordering for similar tasks',
      'Appears on skill detail pages and machine-readable skill profiles',
    ],
    example: {
      event_id: 'resolve_...',
      skill_slug: 'crawl4ai',
      task: 'scrape pricing pages',
      agent: 'codex',
      outcome: 'success',
      install_used: true,
      task_success: true,
      output_quality: 4,
      error_type: null,
      human_review_required: false,
      used_in_production: false,
      workspace: 'sandbox',
      evidence_url: null,
      time_to_useful_ms: 120000,
      notes: 'Solved one narrow sandbox task; no secrets or production data touched.',
      source_version: {
        version: '1.0.0',
        commit_sha: '0123456789abcdef0123456789abcdef01234567',
        content_hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        ref: 'main',
        path: 'SKILL.md',
      },
      dry_run: false,
    },
  }
}

function formatOutcomeContractText() {
  const contract = buildOutcomeContract()
  return [
    'OpenAgentSkill agent outcome contract',
    '',
    `Version: ${contract.version}`,
    `Endpoint: POST ${contract.endpoint}`,
    `Idempotency: ${contract.idempotency}`,
    `Required fields: ${contract.required_fields.join(', ')}`,
    `Event id sources: ${contract.event_id_sources.join('; ')}`,
    `Outcomes: ${contract.outcomes.join(', ')}`,
    `Error types: ${contract.error_types.join(', ')}`,
    `Workspaces: ${contract.workspaces.join(', ')}`,
    '',
    'Recommended flow:',
    '1. Call /api/agent/resolve for one concrete task.',
    '2. Review audit, eval, Trust Score, risk notes, and alternatives.',
    '3. Try the selected skill in a sandbox or low-risk workspace.',
    '4. POST the result to /api/agent/outcome using feedback.event_id.',
    '5. Use dry_run=true before wiring a new agent integration.',
  ].join('\n')
}

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
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('slug,name,version,source_commit_sha,source_content_hash,source_ref,source_path,source_sync_status,ai_review_approved')
      .eq('slug', payload.skill_slug)
      .eq('ai_review_approved', true)
      .maybeSingle()

    if (skillError) {
      return NextResponse.json({ error: 'Failed to validate skill' }, { status: 500 })
    }
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    let sourceVersionVerified = false
    let recordedSourceVersion: {
      version?: string | null
      source_commit_sha?: string | null
      source_content_hash?: string | null
      source_ref?: string | null
      source_path?: string | null
    } = skill
    const suppliedHash = payload.source_version?.content_hash || null
    if (suppliedHash) {
      if (suppliedHash === skill.source_content_hash) {
        sourceVersionVerified = true
      } else {
        const { data: recordedVersion, error: versionError } = await supabase
          .from('skill_versions')
          .select('version,source_commit_sha,source_content_hash,source_ref,source_path')
          .eq('skill_slug', payload.skill_slug)
          .eq('source_content_hash', suppliedHash)
          .limit(1)
          .maybeSingle()

        if (versionError) {
          return NextResponse.json({ error: 'Failed to validate source version' }, { status: 500 })
        }
        if (!recordedVersion) {
          return NextResponse.json(
            { error: 'Source version is not recorded for this skill' },
            { status: 400 }
          )
        }
        recordedSourceVersion = recordedVersion
        sourceVersionVerified = true
      }
    }

    const sourceVersion = {
      skill_version: recordedSourceVersion.version || skill.version || null,
      source_commit_sha: recordedSourceVersion.source_commit_sha || skill.source_commit_sha || null,
      source_content_hash: recordedSourceVersion.source_content_hash || skill.source_content_hash || null,
      source_ref: recordedSourceVersion.source_ref || skill.source_ref || null,
      source_path: recordedSourceVersion.source_path || skill.source_path || null,
      source_sync_status: skill.source_sync_status || null,
      source_version_verified: sourceVersionVerified || Boolean(skill.source_content_hash),
    }
    const metadata = buildOutcomeMetadata({
      outcome: payload.outcome,
      metadata: { ...(payload.metadata || {}), ...sourceVersion },
      task_success: payload.task_success,
      output_quality: payload.output_quality ?? null,
      error_type: payload.error_type ?? null,
      human_review_required: payload.human_review_required,
      used_in_production: payload.used_in_production,
      workspace: payload.workspace,
      evidence_url: payload.evidence_url ?? null,
    })
    const trustImpact = buildOutcomeTrustImpact({
      outcome: payload.outcome,
      installUsed: payload.install_used,
      riskBlocked: payload.risk_blocked || payload.outcome === 'blocked_by_risk',
      setupRequired: payload.setup_required || payload.outcome === 'setup_required',
      outputQuality: payload.output_quality ?? null,
    })

    if (payload.dry_run) {
      return NextResponse.json({
        ok: true,
        success: true,
        dry_run: true,
        message: 'Outcome payload accepted. No database row was written.',
        contract: buildOutcomeContract(),
        normalized_payload: {
          ...payload,
          metadata,
        },
        trust_impact: trustImpact,
        source_version: sourceVersion,
      })
    }

    const writer = createAdminClient()
    const { data, error } = await writer.rpc('record_agent_outcome', {
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
      p_metadata: metadata,
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

    try {
      const admin = createAdminClient()
      const isSuccess = payload.outcome === 'success'
      const verifiedEvents = [
        { event_type: 'agent_call', event_key: `${payload.event_id}:agent-call` },
        { event_type: isSuccess ? 'outcome_success' : 'outcome_failure', event_key: `${payload.event_id}:outcome` },
        ...(payload.install_used ? [{ event_type: isSuccess ? 'install_success' : 'install_failure', event_key: `${payload.event_id}:install` }] : []),
      ].map((event) => ({
        skill_slug: payload.skill_slug,
        ...event,
        source: 'agent_outcome',
        is_verified: true,
        path: '/api/agent/outcome',
        metadata: { agent: payload.agent, outcome: payload.outcome, resolve_event_id: payload.event_id },
      }))
      await admin.from('skill_events').upsert(verifiedEvents, { onConflict: 'event_key' })
    } catch (funnelError) {
      console.warn('[agent-outcome] Verified funnel mirror failed:', funnelError)
    }

    const { data: stats } = await supabase
      .from('agent_outcome_stats')
      .select('*')
      .eq('skill_slug', payload.skill_slug)
      .maybeSingle()

    revalidatePath(`/skills/${payload.skill_slug}`)
    revalidatePath(`/api/agent/skills/${payload.skill_slug}`)

    return NextResponse.json({
      ok: true,
      success: true,
      message: 'Agent outcome recorded',
      event_id: payload.event_id,
      skill_slug: payload.skill_slug,
      outcome: payload.outcome,
      stats: stats || null,
      data,
      contract_version: AGENT_OUTCOME_PROTOCOL_VERSION,
      trust_impact: trustImpact,
      source_version: sourceVersion,
      next_agent_action:
        payload.outcome === 'success'
          ? 'Keep the skill shortlisted for similar tasks and prefer a production review before broader rollout.'
          : 'Review alternatives from /api/agent/resolve before retrying this task.',
    })
  } catch (error) {
    console.error('[agent-outcome] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const skillSlug = request.nextUrl.searchParams.get('skill_slug')
  const format = request.nextUrl.searchParams.get('format')
  const contract = request.nextUrl.searchParams.get('contract')
  const supabase = createPublicClient()

  if (contract === 'true' || contract === '1') {
    if (format === 'text') {
      return new NextResponse(formatOutcomeContractText(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return NextResponse.json(buildOutcomeContract())
  }

  if (skillSlug) {
    const { data, error } = await supabase
      .from('agent_outcome_stats')
      .select('*')
      .eq('skill_slug', skillSlug)
      .maybeSingle()

    if (error || !data) {
      const emptyStats = createEmptyOutcomeStats(skillSlug)
      if (format === 'text') {
        return new NextResponse(formatOutcomeStatsText([emptyStats]), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
      return NextResponse.json(emptyStats)
    }

    if (format === 'text') {
      return new NextResponse(formatOutcomeStatsText([data]), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('agent_outcome_stats')
    .select('*')
      .order('agent_proven_score', { ascending: false, nullsFirst: false })
      .order('total_outcomes', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch outcome stats' }, { status: 500 })
  }

  if (format === 'text') {
    return new NextResponse(formatOutcomeStatsText(data || []), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return NextResponse.json(data || [])
}
