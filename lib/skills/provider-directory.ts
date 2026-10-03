import { EXTERNAL_SKILLS, searchExternalSkills, type ExternalSkill } from './external-catalog'
import { matchesDirectoryCategory } from './directory'
import { validSkillOffer, type PriceFilter, type SkillCommerce } from './commerce'
import { externalSourceHref, externalSourceRel } from './external-outbound'
import type { DirectorySkillCard } from '@/components/skills-page-client'

export function providerTaxonomy(entry: ExternalSkill) {
  const output = entry.provider === 'skillry' ? entry.outputType : 'html'
  return output === 'image' ? { category: 'image-generation', tags: ['image-generation'], output: 'image' }
    : output === 'presentation' ? { category: 'presentation', tags: ['slides'], output: 'slides' }
    : { category: 'design-creative', tags: ['ui-design'], output: 'web' }
}
export function providerCommerce(entry: ExternalSkill, now = Date.now()): SkillCommerce {
  const free = entry.provider === 'skillry' && validSkillOffer({ type: 'free', billing: 'free', sourceUrl: entry.sourceUrl, checkedAt: entry.listingEvidence.observedAt, runtime: 'unknown' }, now)
  return { type: free ? 'free' : 'unknown', billing: free ? 'free' : 'unknown', amount: null, currency: null,
    sourceUrl: entry.sourceUrl, checkedAt: entry.provider === 'skillry' ? entry.listingEvidence.observedAt : null,
    runtime: 'unknown', purchaseUrl: null, checkout: 'external', purchaseRequiresUserConsent: true }
}
export function providerExampleCount(entry: ExternalSkill) { return entry.provider === 'skillry' ? entry.previewImages.length : entry.runtimeDemo ? 1 : 0 }
export function selectProviderSkills(filters: {
  query?: string; category: string; topic: string; output: string; pricing: PriceFilter; examplesOnly: boolean;
  platform: string; quality: string; trust: string; safety: string; supplyTrack: string; minStars: number; useCase: string;
}) {
  // An editorial source is not a measured GitHub rating, install compatibility
  // or security result. These filters must never assign invented evidence.
  if (filters.minStars > 0 || [filters.platform, filters.quality, filters.trust, filters.safety, filters.supplyTrack, filters.useCase].some(value => value !== 'all')) return []
  return searchExternalSkills(filters.query).filter(entry => {
    const taxonomy = providerTaxonomy(entry)
    return matchesDirectoryCategory(taxonomy.category, filters.category) &&
      (filters.topic === 'all' || taxonomy.tags.includes(filters.topic)) &&
      (filters.output === 'all' || taxonomy.output === filters.output) &&
      (filters.pricing === 'all' || providerCommerce(entry).type === filters.pricing) &&
      (!filters.examplesOnly || providerExampleCount(entry) > 0)
  })
}
export function toProviderDirectorySkill(entry: ExternalSkill, locale: string): DirectorySkillCard {
  const lang = locale === 'zh' ? 'zh' : 'en'
  const taxonomy = providerTaxonomy(entry)
  return { id: `provider:${entry.slug}`, slug: entry.slug, name: entry.title[lang], tagline: entry.description[lang],
    category: taxonomy.category, taxonomyTags: taxonomy.tags, stats: { downloads: 0, stars: 0, rating: 0 },
    technical: {}, compatibility: [], author: { name: entry.provider === 'skillry' ? 'Skillry' : entry.author.name },
    commerce: providerCommerce(entry), verified: false, createdAt: entry.publishedAt,
    exampleCount: providerExampleCount(entry),
    provider: { label: entry.provider === 'skillry' ? 'Skillry' : 'RedSkill', sourceHref: externalSourceHref(entry.sourceUrl), sourceRel: externalSourceRel(entry.sourceUrl),
      image: entry.provider === 'skillry' ? entry.previewImages[0].replace('&variant=detail', '&variant=card') : entry.runtimeDemo?.poster,
      exampleLabel: entry.provider === 'skillry' ? (lang === 'zh' ? '原站案例 · Skillry' : 'Source example · Skillry') : (lang === 'zh' ? '本站实录' : 'Recorded here') },
  }
}

// Local editorial rows share the same 16-card window. They are not assigned
// repository scores. Numeric repository sorts keep rows without metrics last.
export function providerRowsFirst(sort: string) { return !['stars', 'downloads', 'trending'].includes(sort) }
export function providerCatalogWindow(offset: number, providerCount: number, sort: string, size = 16) {
  const first = providerRowsFirst(sort)
  const localCount = first ? Math.min(size, Math.max(0, providerCount - offset)) : 0
  return { offset: first ? Math.max(0, offset - providerCount) : offset, limit: Math.max(1, size - localCount) }
}
export function mergeProviderCatalogPage<T>(registry: T[], providers: T[], registryTotal: number, offset: number, sort: string, size = 16) {
  const total = registryTotal + providers.length
  const local = providerRowsFirst(sort) ? providers.slice(offset, offset + size)
    : providers.slice(Math.max(0, offset - registryTotal), Math.max(0, offset + size - registryTotal))
  const items = (providerRowsFirst(sort) ? [...local, ...registry] : [...registry, ...local]).slice(0, size)
  return { items, total, hasMore: offset + size < total }
}
export { EXTERNAL_SKILLS as PROVIDER_SKILLS }
