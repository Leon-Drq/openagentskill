import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { acquisitionTypes, getSkillCommerce, validSkillOffer, reviewedSkillOffers, commerceFilterSlugs, normalizePriceFilter, matchesCommerce, safeCommerceUrl } = await import('../lib/skills/commerce.ts')
const { commerceCopy } = await import('../lib/i18n/commerce-copy.ts')
const now = Date.parse('2026-10-06T12:00:00Z')
for (const slug of ['unknown-repo', '__proto__', 'constructor']) {
  const result = getSkillCommerce(slug, now)
  assert.equal(result.type, 'unknown')
  assert.equal(result.amount, null)
  assert.equal(result.purchaseUrl, null)
  assert.equal(result.purchaseRequiresUserConsent, true)
}
for (const [slug, offer] of Object.entries(reviewedSkillOffers)) {
  assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  assert.ok(validSkillOffer(offer, now))
  assert.equal(getSkillCommerce(slug, now).type, offer.type)
  assert.equal(getSkillCommerce(slug, now + 91 * 86400000).type, 'unknown')
}
assert.equal(getSkillCommerce('hypit-ai-hypit-hypit', now).runtime, 'optional-services')
assert.equal(normalizePriceFilter('not.in.(anything)'), 'all')
assert.ok(matchesCommerce('missing', 'unknown'))
assert.ok(!matchesCommerce('missing', 'free'))
assert.deepEqual(commerceFilterSlugs('paid'), [])
// Synthetic fixtures, not production products or observed prices.
const paid = { type: 'paid', billing: 'monthly', amount: 12, currency: 'USD', sourceUrl:'https://example.com/pricing', purchaseUrl:'https://example.com/checkout', checkedAt:'2026-09-28', runtime:'model' }
assert.ok(validSkillOffer(paid, now))
assert.ok(validSkillOffer({...paid, billing:'yearly'}, now))
assert.ok(validSkillOffer({...paid, billing:'one-time'}, now))
assert.ok(validSkillOffer({...paid, type:'freemium'}, now))
assert.ok(validSkillOffer({...paid, billing:'contact',amount:undefined,currency:undefined}, now))
for (const patch of [{amount:0},{amount:-1},{amount:Infinity},{currency:'usd'},{purchaseUrl:undefined},{purchaseUrl:'javascript:alert(1)'},{checkedAt:'2030-01-01'},{checkedAt:'not-a-date'},{billing:'free'},{type:'free'}]) assert.ok(!validSkillOffer({...paid,...patch},now),JSON.stringify(patch))
for (const url of ['javascript:alert(1)','http://example.com','https://name:secret@example.com','https://localhost','https://127.0.0.1','https://10.0.0.1','https://example.internal','https://example.com:3000','/checkout']) assert.equal(safeCommerceUrl(url),undefined,url)
assert.equal(safeCommerceUrl('https://example.com/checkout'), 'https://example.com/checkout')
for (const locale of ['en','zh','ja','ko','es','de','fr','id']) {
  const copy = commerceCopy(locale)
  assert.deepEqual(Object.keys(copy).sort(),Object.keys(commerceCopy('en')).sort())
  for (const value of Object.values(copy)) assert.ok(value.trim() && !value.includes('\uFFFD'))
  for (const type of acquisitionTypes) assert.ok(copy[type])
}
const db = readFileSync('lib/db/skills.ts','utf8')
for (const name of ['getCachedBrowseCandidates']) {
  const part = db.slice(db.indexOf(`const ${name} =`))
  assert.ok(part.indexOf("query.in('slug', pricingSlugs)") < part.indexOf('.order('),name)
  assert.match(part,/pricing === 'unknown' && pricingSlugs.length/)
}
assert.match(db, /query = applyCatalogFilters\(query, category, minStars, pricing, pricingSlugs, exampleSlugs, topic, output\)/)
assert.doesNotMatch(db.slice(db.indexOf('export function convertSkillRecordToManifest')), /type: 'free'/)
const page = readFileSync('app/skills/content.tsx','utf8')
assert.match(page,/matchesCommerce\(record.slug, pricing\)/)
assert.match(page,/getSkillCatalogPage\(sort, category, page, minStars, pricing,/)
assert.match(page,/index: isCanonicalEnglishDirectory/)
assert.match(readFileSync('app/skills/page.tsx','utf8'),/export const revalidate = 300/)
const ui = readFileSync('components/skill-commerce.tsx','utf8')
assert.match(ui,/!blocked && safeCommerceUrl/)
assert.match(ui,/noopener noreferrer nofollow/)
assert.match(ui,/c.external/)
console.log('Skill commerce: unknown defaults, evidence expiry, paid fixtures, URL safety, 8 locales, before-limit filters and SEO contracts passed.')
