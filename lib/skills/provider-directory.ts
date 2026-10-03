import { EXTERNAL_SKILLS, searchExternalSkills, type ExternalSkill } from './external-catalog'
import { matchesDirectoryCategory } from './directory'
import { validSkillOffer, type PriceFilter, type SkillCommerce } from './commerce'
import { externalSourceHref, externalSourceRel } from './external-outbound'
import type { DirectorySkillCard } from '@/components/skills-page-client'

export function providerTaxonomy(entry: ExternalSkill) {
  const output = entry.provider === 'skillry' ? entry.outputType : 'html'
  if (output === 'video') return { category: 'video-creation', tags: ['video-generation'], output: 'video' }
  if (entry.tags.some(tag => tag.includes('data-visualization'))) return { category: 'data', tags: ['data-visualization'], output: 'web' }
  if (entry.tags.includes('build-project-knowledge-graph')) return { category: 'ai-knowledge', tags: ['knowledge-base'], output: 'web' }
  return output === 'image' ? { category: 'image-generation', tags: ['image-generation'], output: 'image' }
    : output === 'presentation' ? { category: 'presentation', tags: ['slides'], output: 'slides' }
    : { category: 'design-creative', tags: ['ui-design'], output: 'web' }
}
export function providerCommerce(entry: ExternalSkill, now = Date.now()): SkillCommerce {
  const evidence = entry.provider === 'skillry' ? entry.listingEvidence : null
  const cents = evidence?.priceUsdCents ?? null
  const candidate = cents === null ? null : cents === 0
    ? { type: 'free' as const, billing: 'free' as const, sourceUrl: entry.sourceUrl, checkedAt: evidence!.observedAt, runtime: 'unknown' as const }
    : { type: 'paid' as const, billing: 'one-time' as const, amount: cents / 100, currency: 'USD', purchaseUrl: entry.sourceUrl, sourceUrl: entry.sourceUrl, checkedAt: evidence!.observedAt, runtime: 'unknown' as const }
  const offer = candidate && validSkillOffer(candidate, now) ? candidate : null
  return { type: offer?.type ?? 'unknown', billing: offer?.billing ?? 'unknown', amount: offer && 'amount' in offer ? offer.amount ?? null : null, currency: offer && 'currency' in offer ? offer.currency ?? null : null,
    sourceUrl: entry.sourceUrl, checkedAt: entry.provider === 'skillry' ? entry.listingEvidence.observedAt : null,
    runtime: 'unknown', purchaseUrl: offer && 'purchaseUrl' in offer && offer.purchaseUrl ? externalSourceHref(offer.purchaseUrl) : null, checkout: 'external', purchaseRequiresUserConsent: true }
}
export function providerExampleCount(entry: ExternalSkill) { return entry.provider === 'skillry' ? entry.previewImages.length : entry.runtimeDemo ? 1 : 0 }
export function hasProviderCommercialOffers() { return EXTERNAL_SKILLS.some(entry => (entry.provider !== 'skillry' || entry.active) && providerCommerce(entry).type === 'paid') }
export function selectProviderSkills(filters: {
  query?: string; category: string; topic: string; output: string; pricing: PriceFilter; examplesOnly: boolean;
  platform: string; quality: string; trust: string; safety: string; supplyTrack: string; minStars: number; useCase: string; featured?: boolean; sort?: string;
}) {
  // An editorial source is not a measured GitHub rating, install compatibility
  // or security result. These filters must never assign invented evidence.
  if (filters.minStars > 0 || [filters.platform, filters.quality, filters.trust, filters.safety, filters.supplyTrack, filters.useCase].some(value => value !== 'all')) return []
  return searchExternalSkills(filters.query).filter(entry => {
    if (filters.featured && (entry.provider !== 'skillry' || !entry.listingEvidence.featured)) return false
    const taxonomy = providerTaxonomy(entry)
    return matchesDirectoryCategory(taxonomy.category, filters.category) &&
      (filters.topic === 'all' || taxonomy.tags.includes(filters.topic)) &&
      (filters.output === 'all' || taxonomy.output === filters.output) &&
      (filters.pricing === 'all' || providerCommerce(entry).type === filters.pricing) &&
      (!filters.examplesOnly || providerExampleCount(entry) > 0)
  }).sort((a, b) => {
    if (filters.sort === 'new' || filters.sort === 'fresh') return Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.slug.localeCompare(b.slug)
    return Number(b.provider === 'skillry' && b.seoIndexable) - Number(a.provider === 'skillry' && a.seoIndexable) ||
      Number(b.provider === 'skillry' && b.listingEvidence.featured) - Number(a.provider === 'skillry' && a.listingEvidence.featured) ||
      (b.provider === 'skillry' ? b.listingEvidence.downloadCount : 0) - (a.provider === 'skillry' ? a.listingEvidence.downloadCount : 0) || a.slug.localeCompare(b.slug)
  })
}
export function toProviderDirectorySkill(entry: ExternalSkill, locale: string): DirectorySkillCard {
  const lang = locale === 'zh' ? 'zh' : 'en'
  const taxonomy = providerTaxonomy(entry)
  return { id: `provider:${entry.slug}`, slug: entry.slug, name: entry.provider === 'skillry' ? entry.skillName : entry.title[lang], tagline: entry.description[lang],
    category: taxonomy.category, taxonomyTags: taxonomy.tags, stats: { downloads: 0, stars: 0, rating: 0 },
    technical: {}, compatibility: [], author: { name: entry.provider === 'skillry' ? 'Skillry' : entry.author.name },
    commerce: providerCommerce(entry), verified: false, createdAt: entry.publishedAt,
    exampleCount: providerExampleCount(entry),
    provider: { label: entry.provider === 'skillry' ? 'Skillry' : 'RedSkill', localizedName: lang === 'zh' && entry.provider === 'skillry' && entry.title.zh !== entry.skillName ? entry.title.zh : undefined,
      sourceDownloads: entry.provider === 'skillry' ? entry.listingEvidence.downloadCount : undefined, sourceHref: externalSourceHref(entry.sourceUrl), sourceRel: externalSourceRel(entry.sourceUrl),
      image: entry.provider === 'skillry' ? entry.previewImages[0].replace('&variant=detail', '&variant=card') : entry.runtimeDemo?.poster,
      exampleLabel: entry.provider === 'skillry' ? (lang === 'zh' ? '原站案例 · Skillry' : 'Source example · Skillry') : (lang === 'zh' ? '本站实录' : 'Recorded here') },
  }
}

// Local editorial rows share the same 16-card window. They are not assigned
// repository scores. Numeric repository sorts keep rows without metrics last.
export function providerRowsFirst(sort: string) { return !['stars', 'downloads', 'trending'].includes(sort) }
export function providerCatalogWindow(offset: number, providerCount: number, sort: string, size = 16) {
  const first = providerRowsFirst(sort)
  const prefix = first ? Math.min(8, providerCount) : 0
  const localCount = Math.min(size, Math.max(0, prefix - offset))
  return { offset: Math.max(0, offset - prefix), limit: Math.max(1, size - localCount) }
}
export function mergeProviderCatalogPage<T>(registry: T[], providers: T[], registryTotal: number, offset: number, sort: string, size = 16) {
  const total = registryTotal + providers.length
  const prefix = providerRowsFirst(sort) ? Math.min(8, providers.length) : 0
  const before = providers.slice(Math.min(offset, prefix), Math.min(offset + size, prefix))
  const tailStart = prefix + registryTotal
  const after = providers.slice(prefix + Math.max(0, offset - tailStart), prefix + Math.max(0, offset + size - tailStart))
  const items = [...before, ...registry, ...after].slice(0, size)
  return { items, total, hasMore: offset + size < total }
}
export { EXTERNAL_SKILLS as PROVIDER_SKILLS }
