import { NextRequest, NextResponse } from 'next/server'
import { generateBlogPostForSkill, isBlogMcpSkillRecord } from '@/lib/blog/generate'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 300

interface BlogBatchSkill {
  id: string
  slug: string
  name: string
  description: string | null
  long_description: string | null
  tagline: string | null
  category: string | null
  tags: string[] | null
  frameworks: string[] | null
  github_repo: string | null
}

export async function POST(req: NextRequest) {
  if (!isAutomationAuthorized(req, ['INDEXER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 25)

  const supabase = createAdminClient()

  // Fetch skills that don't have a blog post yet
  const { data: skills, error } = await supabase
    .from('skills')
    .select('id, slug, name, description, long_description, tagline, category, tags, frameworks, github_repo')
    .eq('ai_review_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit * 4)

  if (error || !skills) {
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
  }

  // Filter out skills that already have a blog post
  const existingPosts = await supabase
    .from('blog_posts')
    .select('skill_id')

  const existingSkillIds = new Set((existingPosts.data || []).map((post: { skill_id: string | null }) => post.skill_id))
  const skillsNeedingBlog = (skills as BlogBatchSkill[])
    .filter((skill) => !existingSkillIds.has(skill.id) && !isBlogMcpSkillRecord(skill))
    .slice(0, limit)

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
