import { NextRequest, NextResponse } from 'next/server'
import { generateBlogPostForSkill } from '@/lib/blog/generate'
import { createServiceClient } from '@/lib/supabase/public'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Verify secret to prevent abuse
  const authHeader = req.headers.get('authorization')
  const secret = process.env.INDEXER_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { skill_id, skill_slug } = body

  if (!skill_id && !skill_slug) {
    return NextResponse.json({ error: 'skill_id or skill_slug required' }, { status: 400 })
  }

  let resolvedSkillId = skill_id

  // Resolve slug to ID if needed
  if (!resolvedSkillId && skill_slug) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('skills')
      .select('id')
      .eq('slug', skill_slug)
      .single()
    if (!data) {
      return NextResponse.json({ error: `Skill not found: ${skill_slug}` }, { status: 404 })
    }
    resolvedSkillId = data.id
  }

  const result = await generateBlogPostForSkill(resolvedSkillId)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
