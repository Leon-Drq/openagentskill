import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeShowcasePrice, showcasePriceCategory, getShowcasePrice } from '../lib/showcase-pricing.ts'
import { galleryPricingCopy } from '../lib/i18n/gallery-pricing-copy.ts'
import { freeIntakeCopy } from '../lib/i18n/free-intake-copy.ts'
import { hasCommercialOffers } from '../lib/skills/commerce.ts'
import { filterShowcaseCases, SHOWCASE_CASES, getShowcasePage } from '../lib/showcase.ts'

assert.equal(showcasePriceCategory('free'), 'free')
assert.equal(showcasePriceCategory('paid'), 'paid')
assert.equal(showcasePriceCategory('freemium'), 'paid')
assert.equal(showcasePriceCategory('unknown'), null)
for (const value of [undefined, null, 'unknown', 'freemium', 'invalid']) assert.equal(normalizeShowcasePrice(value), 'all')
const checked = Date.parse('2026-09-28T12:00:00Z')
assert.equal(getShowcasePrice('hypit-ai-hypit-hypit', checked), 'free')
assert.equal(getShowcasePrice('hypit-ai-hypit-hypit', checked + 91 * 86400000), null)
assert.equal(getShowcasePrice('not-confirmed', checked), null)
assert.equal(hasCommercialOffers(checked), false)
// Catalog additions may have evidence recorded after the original expiry fixture.
const catalogDate = Date.parse('2026-10-06T12:00:00Z')
for (const item of SHOWCASE_CASES) assert.equal(getShowcasePrice(item.skillSlug, catalogDate), 'free', `Official free-source evidence required for ${item.skillSlug}`)
assert.equal(filterShowcaseCases('all', '', '', '', 'all').length, SHOWCASE_CASES.length)
for (const pricing of ['free', 'paid']) {
  const expected = SHOWCASE_CASES.filter(item => getShowcasePrice(item.skillSlug) === pricing)
  const actual = filterShowcaseCases('all', '', '', '', pricing)
  assert.deepEqual(actual, expected)
  const pages = Array.from({ length: Math.ceil(actual.length / 24) }, (_, index) => getShowcasePage(actual, String(index + 1)).items)
  assert.deepEqual(pages.flat(), expected, 'Filter before pagination; no duplicate or missing cases')
  assert.ok(filterShowcaseCases('video', 'hypit', 'hypit-ai', 'product-demo', pricing).every(item => item.slug === 'hypit-product-explainer' && getShowcasePrice(item.skillSlug) === pricing))
}
for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const copy = galleryPricingCopy(locale)
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(galleryPricingCopy('en')).sort())
  assert.ok(Object.values(copy).every(value => value.trim() && !value.includes('\uFFFD')))
  assert.equal(copy.unknown, undefined)
  for (const key of ['title','confirm','note','required']) assert.ok(freeIntakeCopy(locale, key).trim())
}
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const page = read('app/showcase/page.tsx')
assert.match(page, /params\.tag \|\| params\.pricing/)
assert.ok(page.indexOf('filterShowcaseCases(category, query, creatorId, tagId, pricing)') < page.indexOf('getShowcasePage(cases'))
assert.match(page, /tag\.id, pricing/)
const gallery = read('components/showcase-gallery.tsx')
assert.match(gallery, /next\.delete\('page'\)/)
assert.match(gallery, /next\.set\('pricing', nextPrice\)/)
assert.equal((gallery.match(/filter\('all', '', '', sort, '', 'all'\)/g) || []).length, 2, 'Both reset controls clear pricing')
assert.doesNotMatch(gallery, /value="(?:unknown|freemium)"/)
assert.match(gallery, /data.hasPaid \|\| pricing === 'paid'/)
const tags = read('components/showcase-tags.tsx')
assert.match(tags, /showcaseTagClass/)
assert.match(tags, /flex-wrap items-center gap-2/)
for (const component of ['showcase-card', 'home-showcase-static', 'showcase-detail']) assert.match(read(`components/${component}.tsx`), /<ShowcaseTags item=\{item\} locale=\{locale\}/)
const ui = read('components/showcase-pricing.tsx')
assert.match(ui, /if \(!price\) return null/)
assert.match(ui, /getSkillCommerce\(slug\)/)
assert.match(ui, /cost\[commerce.runtime\]/)
assert.match(ui, /min-h-8.*rounded-\[6px\].*text-\[11px\]/)
assert.doesNotMatch(ui, /cost\.unknown|Price unconfirmed|价格未确认/)
console.log('Gallery pricing: two visible categories, shared evidence, expiry, combined filters, pagination, reset, SEO and eight locales passed.')
