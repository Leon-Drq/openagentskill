export type SkillSitemapEntry = {
  url: string
  lastModified?: string
  changeFrequency: 'weekly'
  priority: number
}
export type SkillSitemapSnapshot = {
  version: 1
  policy: string
  generatedAt: string
  count: number
  entries: SkillSitemapEntry[]
}
// Keep the structural reader usable by the native Node backup CLI. Its caller
// supplies the same pure URL policy used by proxy redirects and public lookup.
export function validateSkillSitemapSnapshot(value: unknown, policy: string, isCanonicalSkillSlug: (slug: string) => boolean): SkillSitemapSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid sitemap snapshot')
  const s = value as SkillSitemapSnapshot
  if (s.version !== 1 || s.policy !== policy || !Number.isFinite(Date.parse(s.generatedAt)) ||
    !Number.isSafeInteger(s.count) || s.count < 0 || !Array.isArray(s.entries) || s.entries.length !== s.count) {
    throw new Error('Incomplete or incompatible sitemap snapshot')
  }
  const urls = new Set<string>()
  for (const e of s.entries) {
    if (!e || typeof e.url !== 'string' || !/^https:\/\/www\.openagentskill\.com\/skills\/[^/?#\s<>]+$/.test(e.url) ||
      urls.has(e.url) || e.changeFrequency !== 'weekly' || ![0.76,0.82].includes(e.priority) ||
      (e.lastModified !== undefined && !Number.isFinite(Date.parse(e.lastModified)))) {
      throw new Error('Invalid or duplicate sitemap URL')
    }
    if (!isCanonicalSkillSlug(e.url.slice('https://www.openagentskill.com/skills/'.length))) {
      throw new Error('Noncanonical sitemap URL')
    }
    urls.add(e.url)
  }
  return s
}
