/**
 * Blog Post Generator
 *
 * Automatically generates Markdown blog posts for newly indexed skills
 * using AI (gpt-4o-mini via Vercel AI Gateway).
 */

import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateText } from 'ai'

export interface BlogGenerateResult {
  success: boolean
  slug?: string
  reason?: string
}

export interface BlogSkillPreview {
  slug: string
  name: string
  description: string
  category: string
  tags: string[]
  github_repo: string
  github_stars: number
  created_at: string
  quality_score: number
  author_name: string
}

export interface BlogHubData {
  totalSkills: number
  recentLaunchCount: number
  launchWindowHours: number
  latestSkills: BlogSkillPreview[]
  topRecentSkills: BlogSkillPreview[]
  categoryHighlights: Array<{ category: string; count: number }>
}

interface BlogSkillRow extends BlogSkillPreview {
  long_description: string | null
  tagline: string | null
  frameworks: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBlogSlug(skillSlug: string): string {
  return `introducing-${skillSlug}`
}

function isMcpText(value: string) {
  return /(^|[^a-z0-9])mcp([^a-z0-9]|$)/i.test(value) || /\bmodel context protocol\b/i.test(value)
}

export function isBlogMcpSkillRecord(record: {
  name?: string | null
  description?: string | null
  long_description?: string | null
  tagline?: string | null
  category?: string | null
  tags?: string[] | null
  frameworks?: string[] | null
  github_repo?: string | null
}) {
  const text = [
    record.name,
    record.description,
    record.long_description,
    record.tagline,
    record.category,
    record.github_repo,
    ...(record.tags || []),
    ...(record.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')

  return isMcpText(text)
}

function toSkillPreview(row: BlogSkillRow): BlogSkillPreview {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags || [],
    github_repo: row.github_repo,
    github_stars: Number(row.github_stars || 0),
    created_at: row.created_at,
    quality_score: Number(row.quality_score || 0),
    author_name: row.author_name,
  }
}

async function fetchApprovedSkillRows() {
  const supabase = createPublicClient()
  const rows: BlogSkillRow[] = []

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('skills')
      .select(`
        slug, name, description, long_description, tagline, category, tags, frameworks,
        github_repo, github_stars, created_at, quality_score, author_name
      `)
      .eq('ai_review_approved', true)
      .order('created_at', { ascending: false })
      .range(from, from + 999)

    if (error) throw new Error(error.message)
    rows.push(...((data || []) as BlogSkillRow[]))
    if (!data || data.length < 1000) break
  }

  return rows.filter((row) => !isBlogMcpSkillRecord(row))
}

// ─── AI Content Generator ─────────────────────────────────────────────────────

async function generateBlogContent(skill: {
  slug: string
  name: string
  description: string
  long_description: string | null
  category: string
  tags: string[]
  github_repo: string
  github_stars: number
  author_name: string
  install_command: string | null
}): Promise<{ title: string; summary: string; content: string }> {
  const prompt = `You are the editorial voice for OpenAgentSkill Update, a practical dispatch for developers building AI agents.

Write a scenario-driven blog post introducing this skill to developers:

Skill Name: ${skill.name}
Description: ${skill.description}
Category: ${skill.category}
Tags: ${skill.tags.join(', ')}
GitHub: https://github.com/${skill.github_repo}
Stars: ${skill.github_stars}
Author: ${skill.author_name}
Install: ${skill.install_command || `npx skills add ${skill.github_repo}`}

README excerpt:
${(skill.long_description || '').slice(0, 1200)}

Write a blog post in Markdown with this exact structure:

## Where this fits
(2-3 sentences explaining the developer workflow or user problem this skill helps with. Start from a concrete user scenario.)

## Why agents benefit
(3-5 bullets describing concrete agent capabilities, not generic features)

## Practical scenarios
(3 real-world scenarios with brief explanations, written as subheadings)

## Add it to your agent workflow
(Installation and a small usage example using the install command)

## Compare before adopting
(Mention what to compare: quality signals, maintenance freshness, alternatives, and workflow fit)

## Why it is worth tracking
(1 paragraph on quality signals, community momentum, and when to evaluate it)

Rules:
- Write in English, clear and concise
- Code blocks must use proper markdown fencing with language tags
- Do NOT include a top-level H1 title (it will be added separately)
- Keep the total length between 400-600 words
- Be useful and specific. Avoid hype, vague claims, and feature-list padding.
- Mention OpenAgentSkill only when it adds context.
- Include one natural internal-link sentence using this exact URL when relevant: https://www.openagentskill.com/skills/${skill.slug}

Respond with JSON only:
{"title":"Blog post title (max 60 chars)","summary":"One sentence meta description (max 155 chars)","content":"Full markdown content"}`

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt,
    temperature: 0.7,
  })

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in AI response')

  const parsed = JSON.parse(match[0])
  return {
    title: parsed.title,
    summary: parsed.summary,
    content: parsed.content,
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function generateBlogPostForSkill(skillId: string): Promise<BlogGenerateResult> {
  const supabase = createAdminClient()

  try {
    // 1. Fetch skill data
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('id, slug, name, description, long_description, category, tags, github_repo, github_stars, author_name, install_command')
      .eq('id', skillId)
      .single()

    if (skillError || !skill) {
      return { success: false, reason: `Skill not found: ${skillId}` }
    }

    // 2. Check if blog post already exists
    const blogSlug = buildBlogSlug(skill.slug)
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', blogSlug)
      .maybeSingle()

    if (existing) {
      return { success: false, reason: 'Blog post already exists', slug: blogSlug }
    }

    // 3. Generate content via AI
    const { title, summary, content } = await generateBlogContent(skill)

    // 4. Insert into blog_posts
    const { error: insertError } = await supabase.from('blog_posts').insert({
      skill_id: skill.id,
      slug: blogSlug,
      title,
      summary,
      content,
      published_at: new Date().toISOString(),
    })

    if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)

    return { success: true, slug: blogSlug }
  } catch (error: unknown) {
    return { success: false, reason: error instanceof Error ? error.message : 'Blog generation failed' }
  }
}

// ─── Fetch helpers for pages ──────────────────────────────────────────────────

export async function getBlogPosts(limit = 20) {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, summary, published_at,
      skills ( slug, name, category, github_stars, author_name )
    `)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

export async function getBlogPostBySlug(slug: string) {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, summary, content, published_at,
      skills ( slug, name, category, github_stars, author_name, github_repo, install_command, tags )
    `)
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getBlogHubData(): Promise<BlogHubData> {
  const rows = await fetchApprovedSkillRows()
  const previews = rows.map(toSkillPreview)
  const launchWindowHours = 24
  const recentCutoff = Date.now() - launchWindowHours * 60 * 60 * 1000
  const recentSkills = previews.filter((skill) => new Date(skill.created_at).getTime() >= recentCutoff)
  const categoryCounts = new Map<string, number>()

  for (const skill of previews) {
    if (!skill.category) continue
    categoryCounts.set(skill.category, (categoryCounts.get(skill.category) || 0) + 1)
  }

  return {
    totalSkills: previews.length,
    recentLaunchCount: recentSkills.length,
    launchWindowHours,
    latestSkills: recentSkills
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8),
    topRecentSkills: recentSkills
      .sort((a, b) => b.github_stars - a.github_stars)
      .slice(0, 8),
    categoryHighlights: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  }
}
