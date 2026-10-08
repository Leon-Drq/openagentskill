import assert from 'node:assert/strict'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { directoryAccessScope, firstPartyPaidSlugs, emptyDirectoryFilters, updateDirectoryFilters, directoryFilterUpdates } = await import('../lib/skills/directory-filters.ts')
const { directoryHref } = await import('../lib/skills/directory.ts')
const { directoryFilterCopy } = await import('../lib/i18n/directory-filter-copy.ts')
const { selectProviderSkills } = await import('../lib/skills/provider-directory.ts')

assert.deepEqual(directoryAccessScope('free', 'paid'), {access:'free',pricing:'free',includeProviders:true,includeRegistry:true})
assert.deepEqual(directoryAccessScope('paid'), {access:'paid',pricing:'paid',includeProviders:false,includeRegistry:true})
assert.deepEqual(directoryAccessScope('third-party'), {access:'third-party',pricing:'all',includeProviders:true,includeRegistry:false})
assert.equal(directoryAccessScope(undefined, 'paid').pricing, 'paid', 'Legacy paid links still include externally paid offers')
assert.equal(directoryAccessScope('third-party', 'free').pricing, 'free', 'Source and acquisition price may intersect')
assert.equal(directoryAccessScope('untrusted-value').access, 'all')

const now=Date.parse('2026-10-07T00:00:00Z')
const offer={seller:'openagentskill',type:'paid',billing:'one-time',amount:10,currency:'USD',sourceUrl:'https://www.openagentskill.com/skills/example',purchaseUrl:'https://www.openagentskill.com/checkout/example',checkedAt:'2026-10-06',runtime:'model'}
assert.deepEqual(firstPartyPaidSlugs({
  owned:offer, external:{...offer,seller:undefined}, unknownOwner:{...offer,seller:'external'},
  free:{...offer,type:'free',billing:'free',amount:undefined,purchaseUrl:undefined},
  stale:{...offer,checkedAt:'2025-01-01'}, missingCheckout:{...offer,purchaseUrl:undefined},
},now), ['owned'], 'Only explicit first-party ownership and current valid paid evidence qualify')

const applied={...emptyDirectoryFilters,category:'image-generation',tag:'images',output:'image',access:'third-party',pricing:'free',useCase:'create-content',track:'creative'}
const draft=updateDirectoryFilters(applied,{category:'presentation'})
assert.equal(applied.category,'image-generation', 'Editing or cancelling a draft never mutates applied filters')
assert.deepEqual([draft.tag,draft.useCase,draft.track],['all','all','all'])
const changedAccess=updateDirectoryFilters(draft,{access:'free'})
assert.equal(changedAccess.pricing,'all', 'Switching access clears stale legacy price restrictions')
const href=directoryHref('/zh/skills','q=deck&lang=zh&sort=new&page=7&view=skills&quality=trusted',directoryFilterUpdates(changedAccess))
const url=new URL(href,'https://www.openagentskill.com')
assert.equal(url.pathname,'/zh/skills')
for (const [key,value] of Object.entries({q:'deck',lang:'zh',sort:'new',access:'free',category:'presentation',output:'image'})) assert.equal(url.searchParams.get(key),value)
for (const key of ['page','view','quality','pricing','tag','track','useCase']) assert.equal(url.searchParams.has(key),false)
assert.equal(directoryHref('/skills','q=deck&sort=new&page=7&access=free&output=slides',directoryFilterUpdates(emptyDirectoryFilters)), '/skills?q=deck&sort=new', 'Reset in the sheet clears filters, preserving search and sort')

const defaults={category:'all',topic:'all',output:'all',examplesOnly:false,platform:'all',quality:'all',trust:'all',safety:'all',supplyTrack:'all',minStars:0,useCase:'all'}
const all=selectProviderSkills({...defaults,pricing:directoryAccessScope('third-party').pricing})
const free=selectProviderSkills({...defaults,pricing:directoryAccessScope('free').pricing})
assert.ok(free.length>0 && free.length<all.length)
assert.ok(free.every(skill=>all.some(other=>other.slug===skill.slug)), 'Free provider entries are available in both browsing intents')
for (const locale of ['en','zh','ja','ko','es','de','fr','id']) {
  const copy=directoryFilterCopy(locale)
  assert.deepEqual(Object.keys(copy),Object.keys(directoryFilterCopy('en')))
  assert.ok(Object.values(copy).every(text=>text.trim()&&!text.includes('\uFFFD')))
}
console.log('Directory filters: access semantics, first-party evidence, mobile drafts, dependent resets, old URLs and eight locales passed.')
