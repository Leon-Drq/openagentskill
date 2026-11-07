import { unstable_cache } from 'next/cache'
import { getApprovedSkillSitemapCount, getApprovedSkillSitemapSource } from '@/lib/db/skills'
import { buildSkillSitemapPolicy, SEARCH_INDEX_MIN_GITHUB_STARS, SEARCH_INDEX_MIN_QUALITY_SCORE } from '@/lib/seo/search-indexability'
import { isMcpOnlySkillRecord } from '@/lib/skills/registry-scope'
import { isCanonicalSkillSlug } from '@/lib/skill-fallbacks'
import { validateSkillSitemapSnapshot, type SkillSitemapSnapshot } from '@/lib/seo/sitemap-snapshot'
import { packCacheJson, unpackCacheJson } from '@/lib/cache/packed-json'
import { createCoalescedCache } from '@/lib/cache/coalesced'
import saved from './sitemap-backup.json'

const policy = buildSkillSitemapPolicy()
const readSource = createCoalescedCache<string>({ttlMs:30_000,maxEntries:1,cacheWhen:()=>true})

async function captureCompleteSnapshot(): Promise<string> {
  const deadline = Date.now() + 90_000
  const source = await getApprovedSkillSitemapSource(SEARCH_INDEX_MIN_GITHUB_STARS, SEARCH_INDEX_MIN_QUALITY_SCORE)
  const count = source.count
  const entries: SkillSitemapSnapshot['entries'] = []
  for (let offset = 0; offset < count; offset += 1000) {
    if (Date.now() >= deadline) throw new Error('Sitemap capture exceeded its budget')
    const rows = await source.read(offset, Math.min(1000,count-offset))
    if (rows.length !== Math.min(1000, count-offset)) throw new Error('Incomplete sitemap source page')
    for (const row of rows) {
      if (isMcpOnlySkillRecord(row) || !isCanonicalSkillSlug(row.slug)) continue
      const date = row.github_last_pushed_at || row.created_at
      const lastModified = date && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : undefined
      entries.push({url:`https://www.openagentskill.com/skills/${row.slug}`,lastModified,changeFrequency:'weekly',priority:Number(row.github_stars || 0)>=500 ? 0.82 : 0.76})
    }
  }
  const finalCount = await getApprovedSkillSitemapCount(SEARCH_INDEX_MIN_GITHUB_STARS, SEARCH_INDEX_MIN_QUALITY_SCORE, true)
  if (count !== finalCount) throw new Error('Sitemap source changed during capture')
  const snapshot = validateSkillSitemapSnapshot({version:1,policy,generatedAt:new Date().toISOString(),count:entries.length,entries},policy,isCanonicalSkillSlug)
  return packCacheJson(snapshot)
}

// One complete generation is the cache item. Index and every shard therefore
// share a URL set; a failed refresh cannot replace it with a partial capture.
const getCachedCompleteSnapshot = unstable_cache(
  () => readSource(policy, captureCompleteSnapshot),
  ['complete-skill-sitemap-v4-canonical-scope',policy],
  {revalidate: 14400,tags:['approved-sitemap-count','approved-sitemap-records']}
)

export async function getSkillSitemapSnapshot(): Promise<SkillSitemapSnapshot> {
  try {
    return validateSkillSitemapSnapshot(await unpackCacheJson(await getCachedCompleteSnapshot()),policy,isCanonicalSkillSlug)
  } catch (error) {
    // A checked-in, complete public URL backup also survives a cold process,
    // deployment or Data Cache loss. Never persist it as a fresh live read.
    if (typeof saved.packed !== 'string') throw error
    return validateSkillSitemapSnapshot(await unpackCacheJson(saved.packed),policy,isCanonicalSkillSlug)
  }
}
