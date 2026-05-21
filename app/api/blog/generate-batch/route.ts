import { NextRequest, NextResponse } from 'next/server'
import { generateBlogPostForSkill } from '@/lib/blog/generate'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  if (!isAutomationAuthorized(req, ['INDEXER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { limit = 10 } = body

  const supabase = createAdminClient()

  // Fetch skills that don't have a blog post yet
  const { data: skills, error } = await supabase
    .from('skills')
    .select('id, slug, name')
    .eq('ai_review_approved', true)
    .order('github_stars', { ascending: false })
    .limit(limit)

  if (error || !skills) {
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
  }

  // Filter out skills that already have a blog post
  const existingPosts = await supabase
    .from('blog_posts')
    .select('skill_id')

  const existingSkillIds = new Set((existingPosts.data || []).map((p: any) => p.skill_id))
  const skillsNeedingBlog = skills.filter((s: any) => !existingSkillIds.has(s.id))

  const results = []
  for (const skill of skillsNeedingBlog) {
    const result = await generateBlogPostForSkill(skill.id)
    results.push({ skill: skill.slug, ...result })
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000))
  }

  return NextResponse.json({
    total: skillsNeedingBlog.length,
    results,
  })
}
