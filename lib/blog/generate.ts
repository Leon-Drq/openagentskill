/**
 * Blog Post Generator
 *
 * Automatically generates Markdown blog posts for newly indexed skills
 * using AI (gpt-4o-mini via Vercel AI Gateway).
 */

import { createServiceClient } from '@/lib/supabase/public'
import { generateText } from 'ai'

export interface BlogGenerateResult {
  success: boolean
  slug?: string
  reason?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBlogSlug(skillSlug: string): string {
  return `introducing-${skillSlug}`
}

// ─── AI Content Generator ─────────────────────────────────────────────────────

async function generateBlogContent(skill: {
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
  const prompt = `You are a technical writer for Open Agent Skill (openagentskill.com), the open marketplace for AI agent skills.

Write an engaging blog post introducing this skill to developers:

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

## What is ${skill.name}?
(2-3 sentences explaining what it does and why it matters for AI agents)

## Key Features
(3-5 bullet points of standout features)

## Use Cases
(3 real-world use cases with brief explanations, written as subheadings)

## Quick Start
(Installation and basic usage code example using the install command)

## Why We Love It
(1 paragraph on why this skill is worth using, mention stars/community if notable)

Rules:
- Write in English, clear and concise
- Code blocks must use proper markdown fencing with language tags
- Do NOT include a top-level H1 title (it will be added separately)
- Keep the total length between 400-600 words
- Be enthusiastic but accurate

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
  const supabase = createServiceClient()

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
  } catch (error: any) {
    return { success: false, reason: error.message }
  }
}

// ─── Fetch helpers for pages ──────────────────────────────────────────────────

export async function getBlogPosts(limit = 20) {
  const supabase = createServiceClient()
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
  const supabase = createServiceClient()
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
