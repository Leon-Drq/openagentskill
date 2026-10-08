import { normalizePriceFilter, reviewedSkillOffers, validSkillOffer, type PriceFilter, type SkillOffer } from './commerce'

export const directoryAccessOptions = ['all', 'free', 'paid', 'third-party'] as const
export type DirectoryAccess = typeof directoryAccessOptions[number]

export function normalizeDirectoryAccess(value: string | undefined): DirectoryAccess {
  return directoryAccessOptions.includes(value as DirectoryAccess) ? value as DirectoryAccess : 'all'
}

// Access describes a browsing intent. Third-party is a source, so it can overlap
// with free acquisition. Existing pricing URLs keep their original meaning.
export function directoryAccessScope(value?: string, legacyPricing?: string) {
  const access = normalizeDirectoryAccess(value)
  const pricing: PriceFilter = access === 'free' ? 'free' : access === 'paid' ? 'paid' : normalizePriceFilter(legacyPricing)
  return { access, pricing, includeProviders: access !== 'paid', includeRegistry: access !== 'third-party' }
}

export function firstPartyPaidSlugs(offers: Readonly<Record<string, SkillOffer>> = reviewedSkillOffers, now = Date.now()) {
  return Object.entries(offers).filter(([, offer]) => offer.seller === 'openagentskill' && offer.type === 'paid' && validSkillOffer(offer, now)).map(([slug]) => slug)
}

export const directoryFilterKeys = ['access', 'category', 'tag', 'output', 'pricing', 'featured', 'examples', 'useCase', 'platform', 'minStars', 'quality', 'trust', 'safety', 'track'] as const
export type DirectoryFilterDraft = Record<typeof directoryFilterKeys[number], string>
export const emptyDirectoryFilters = Object.fromEntries(directoryFilterKeys.map(key => [key, 'all'])) as DirectoryFilterDraft

export function updateDirectoryFilters(current: DirectoryFilterDraft, updates: Partial<DirectoryFilterDraft>): DirectoryFilterDraft {
  return {
    ...current, ...updates,
    ...(Object.hasOwn(updates, 'category') ? { tag: 'all', useCase: 'all', track: 'all' } : {}),
    ...(Object.hasOwn(updates, 'access') ? { pricing: 'all' } : {}),
  }
}

/** One atomic mobile apply, including cleared fields, without losing q/sort/lang. */
export function directoryFilterUpdates(draft: DirectoryFilterDraft): Record<string, string | undefined> {
  return { ...Object.fromEntries(directoryFilterKeys.map(key => [key, draft[key] === 'all' ? undefined : draft[key]])), view: undefined }
}
