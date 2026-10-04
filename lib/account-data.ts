import type { SupabaseClient } from '@supabase/supabase-js'
import type { Locale } from './i18n/config'
import { getExternalSkill } from './skills/external-catalog'
import { PUBLIC_SKILL_FILTER } from './skills/publication'
import { mergeSavedSlugs, type SavedSkill } from './account-workspace'

export async function readSavedCount(client: SupabaseClient, userId: string) {
  const [github, providers] = await Promise.all([
    client.from('bookmarks').select('skill_slug', { count: 'exact', head: true }).eq('user_id', userId).abortSignal(AbortSignal.timeout(8000)),
    client.from('provider_skill_engagement').select('skill_slug', { count: 'exact', head: true }).eq('user_id', userId).eq('saved', true).abortSignal(AbortSignal.timeout(8000)),
  ])
  return github.error || providers.error || typeof github.count !== 'number' || typeof providers.count !== 'number' ? null : github.count + providers.count
}

export async function readSavedPage(client: SupabaseClient, userId: string, locale: Locale, after: string | null, limit = 24) {
  let github = client.from('bookmarks').select('skill_slug').eq('user_id', userId).order('skill_slug').limit(limit + 1)
  let providers = client.from('provider_skill_engagement').select('skill_slug').eq('user_id', userId).eq('saved', true).order('skill_slug').limit(limit + 1)
  if (after) { github = github.gt('skill_slug', after); providers = providers.gt('skill_slug', after) }
  const sources = await Promise.all([github.abortSignal(AbortSignal.timeout(8000)), providers.abortSignal(AbortSignal.timeout(8000))])
  if (sources.some(result => result.error)) return null
  const page = mergeSavedSlugs(sources.map(result => result.data || []), limit)
  const regular = page.slugs.filter(slug => !getExternalSkill(slug))
  const details = regular.length ? await client.from('skills').select('slug,name,description,category,github_repo').in('slug', regular).or(PUBLIC_SKILL_FILTER).abortSignal(AbortSignal.timeout(8000)) : { data: [], error: null }
  if (details.error) return null
  const bySlug = new Map((details.data || []).map(row => [row.slug, row]))
  const items: SavedSkill[] = page.slugs.map(slug => {
    const external = getExternalSkill(slug)
    if (external) return { slug, name: external.provider === 'skillry' ? external.skillName : external.title[locale === 'zh' ? 'zh' : 'en'], description: external.description[locale === 'zh' ? 'zh' : 'en'], category: null, source: external.provider === 'skillry' ? 'Skillry' : 'RedSkill', available: true }
    const skill = bySlug.get(slug)
    return { slug, name: skill?.name || slug, description: skill?.description || '', category: skill?.category || null, source: 'GitHub', available: Boolean(skill) }
  })
  return { items, next: page.next }
}
