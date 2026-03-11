import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/public'

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
    const body = await request.json()
    
    const { skill_slug, agent_id, success, latency_ms, error_message, metadata } = body

    // 验证必填字段
    if (!skill_slug || typeof skill_slug !== 'string') {
      return NextResponse.json({ error: 'skill_slug is required' }, { status: 400 })
    }
    if (!agent_id || typeof agent_id !== 'string') {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
    }
    if (typeof success !== 'boolean') {
      return NextResponse.json({ error: 'success must be a boolean' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. 验证 skill 存在，并获取作者 user_id
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('slug, author_name, author_user_id')
      .eq('slug', skill_slug)
      .single()

    if (skillError || !skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // 2. 插入 feedback 记录
    const { error: insertError } = await supabase
      .from('skill_feedback')
      .insert({
        skill_slug,
        agent_id,
        success,
        latency_ms: latency_ms || null,
        error_message: error_message || null,
        metadata: metadata || {},
      })

    if (insertError) {
      console.error('[feedback] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
    }

    // 3. 如果成功调用，给作者发放积分
    let pointsAwarded = 0
    if (success && skill.author_user_id) {
      // 每次成功调用奖励 1 积分
      const { error: pointsError } = await supabase
        .from('point_events')
        .insert({
          user_id: skill.author_user_id,
          amount: 1,
          event_type: 'skill_called',
          description: `Skill "${skill_slug}" called by ${agent_id}`,
          ref_id: skill_slug,
        })
      
      if (!pointsError) {
        pointsAwarded = 1
      }
    }

    // 4. 记录到 activity_feed
    if (success) {
      await supabase.from('activity_feed').insert({
        type: 'skill_called',
        skill_slug,
        actor_name: agent_id,
        metadata: { latency_ms, success: true, points_awarded: pointsAwarded },
      }).catch(() => {}) // 忽略 activity 写入失败
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Feedback recorded',
      data: { skill_slug, agent_id, success, points_awarded: pointsAwarded }
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

  const supabase = createServiceClient()

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
