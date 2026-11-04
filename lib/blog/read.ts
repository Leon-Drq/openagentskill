import type { SupabaseClient } from '@supabase/supabase-js'
import type { StaticBlogPost, StaticBlogSkill } from './static-posts'

type StoredPost = Omit<StaticBlogPost, 'skills'> & { skill_id: string | null }
const postColumns = 'id,skill_id,slug,title,summary,content,published_at'
const summaryColumns = 'id,skill_id,slug,title,summary,published_at'
const skillColumns = 'id,slug,name,category,github_stars,author_name,github_repo,install_command,tags'

// Flat, bounded reads work on both D1 and Postgres. Do not turn a rejected
// embedded-relation query (or a temporary outage) into a missing article.
async function attachPublicSkills<T extends { skill_id: string | null }>(client: SupabaseClient, posts: T[]) {
  const ids = [...new Set(posts.map(post => post.skill_id).filter((id): id is string => Boolean(id)))]
  const skills = new Map<string, StaticBlogSkill>()
  if (ids.length) {
    const { data, error } = await client.from('skills').select(skillColumns).in('id', ids)
    // Related cards are optional. A failed reference lookup must not discard an
    // independently published article, or expose partially returned Skill data.
    if (error) console.warn('[blog] Related Skill cards temporarily unavailable')
    else for (const row of data || []) skills.set(row.id, row as StaticBlogSkill)
  }
  // The public client applies publication policy: a private/deleted reference
  // must not expose that Skill or hide the independently published article.
  return posts.map(({ skill_id, ...post }) => ({ ...post, skills: skills.get(skill_id || '') || null }))
}

export async function readPublishedBlogPosts(client: SupabaseClient, limit = 20) {
  const { data, error } = await client.from('blog_posts').select(summaryColumns)
    .order('published_at', { ascending: false }).limit(Math.max(1, Math.min(1000, Math.floor(limit))))
  if (error) throw new Error('Published articles temporarily unavailable')
  return attachPublicSkills(client, (data || []) as Omit<StoredPost, 'content'>[])
}

export async function readPublishedBlogPost(client: SupabaseClient, slug: string) {
  const { data, error } = await client.from('blog_posts').select(postColumns).eq('slug', slug).maybeSingle()
  if (error) throw new Error('Published article temporarily unavailable')
  if (!data) return null
  return (await attachPublicSkills(client, [data as StoredPost]))[0]
}

export async function readPublishedBlogSitemap(client: SupabaseClient) {
  const entries: { slug: string; published_at: string; updated_at: string | null }[] = []
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const { data, error } = await client.from('blog_posts').select('slug,published_at,updated_at')
      .order('slug').range(offset, offset + 999)
    if (error) throw new Error('Published article sitemap temporarily unavailable')
    entries.push(...(data || []))
    if (!data || data.length < 1000) return entries
  }
  throw new Error('Published article sitemap needs sharding')
}
