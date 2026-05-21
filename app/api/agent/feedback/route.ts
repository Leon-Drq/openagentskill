import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase/public'

const FeedbackSchema = z.object({
  skill_slug: z.string().min(1).max(200),
  agent_id: z.string().min(1).max(200),
  success: z.boolean(),
  latency_ms: z.number().int().nonnegative().nullable().optional(),
  error_message: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Agent Feedback Loop API
 * 
 * Agent 每次调用 skill 后上报反馈，用于：
 * 1. 真实排行榜（调用次数、成功率）
 * 2. 质量自动筛选
 * 3. 作者积分奖励
 * 
 * POST /api/agent/feedback
 * {
 *   "skill_slug": "media-crawler",
 *   "agent_id": "claude-3.5",
 *   "success": true,
 *   "latency_ms": 1200,
 *   "error_message": null
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = FeedbackSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid feedback payload',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { skill_slug, agent_id, success, latency_ms, error_message, metadata } = parsed.data

    const supabase = createPublicClient()
    const { data, error } = await supabase.rpc('record_agent_feedback', {
      p_skill_slug: skill_slug,
      p_agent_id: agent_id,
      p_success: success,
      p_latency_ms: latency_ms ?? null,
      p_error_message: error_message ?? null,
      p_metadata: metadata || {},
    })

    if (error) {
      console.error('[feedback] RPC error:', error)
      return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
    }

    if (data?.error === 'skill_not_found') {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Feedback recorded',
      data
    })

  } catch (error) {
    console.error('[feedback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/agent/feedback?skill_slug=xxx
 * 获取某个 skill 的统计数据
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const skill_slug = searchParams.get('skill_slug')

  const supabase = createPublicClient()

  if (skill_slug) {
    // 单个 skill 的统计
    const { data, error } = await supabase
      .from('skill_stats')
      .select('*')
      .eq('skill_slug', skill_slug)
      .single()

    if (error || !data) {
      return NextResponse.json({ 
        skill_slug, 
        total_calls: 0, 
        success_rate: null, 
        unique_agents: 0 
      })
    }
    return NextResponse.json(data)
  }

  // 所有 skill 的统计（排行榜）
  const { data, error } = await supabase
    .from('skill_stats')
    .select('*')
    .order('total_calls', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
