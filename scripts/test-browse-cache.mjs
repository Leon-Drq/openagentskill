import assert from 'node:assert/strict'
import { directoryBrowseVariant, parseDirectoryBrowseVariant } from '../lib/skills/browse-cache.ts'
import { publicCachedRoute } from '../lib/public-cached-routing.ts'
import { SKILL_CATEGORIES } from '../lib/skills/taxonomy.ts'

const variant = query => directoryBrowseVariant(new URLSearchParams(query))
const valid = [
  ['sort=new', 'new~1~all~all'], ['page=2', 'quality~2~all~all'],
  ['sort=fresh&page=10&category=design-creative', 'fresh~10~category~design-creative'],
  ['examples=true&sort=downloads', 'downloads~1~examples~true'],
  ['view=skills', 'quality~1~featured~true'], ['view=skills&featured=false', 'quality~1~all~all'],
  ['access=paid', 'quality~1~access~paid'], ['view=all', 'quality~1~all~all'],
]
for (const [query, key] of valid) {
  assert.equal(variant(query)?.key, key)
  assert.deepEqual(parseDirectoryBrowseVariant(key), variant(query))
  assert.deepEqual(variant(`${query}&utm_source=arbitrary&_rsc=different`), variant(query))
  for (const locale of ['en','zh','ja','ko','es','de','fr','id']) {
    const path = locale === 'en' ? '/skills' : `/${locale}/skills`
    assert.equal(publicCachedRoute(path, new URLSearchParams(query)), `/cached-public/${locale}/directory/${key}`)
  }
}
for (const query of ['q=design', 'q=', 'page=11', 'page=99999999', 'page=01', 'page=0', 'page=1.5',
  'page=2&page=3', 'sort=new&sort=stars', 'sort=random', 'category=random', 'unknown=1',
  'access=random', 'view=random', 'featured=all', 'category=design-creative&access=free',
  'category=design-creative&examples=true', 'minStars=100']) {
  assert.equal(variant(query), null, query)
}
for (const key of ['new~999~all~all','new~1~all~extra','new~1~q~secret','new~1~all~all~extra','../new','new~1~featured~false']) {
  assert.equal(parseDirectoryBrowseVariant(key), null, key)
}
// Exhaust the allowed key space and verify every key has one canonical state.
const keys = new Set()
const facets = ['', ...[...SKILL_CATEGORIES.map(row => row[0]), 'motion-design'].map(category => `category=${category}`),
  ...['free','paid','third-party'].map(access => `access=${access}`), 'featured=true', 'examples=true']
for (const sort of ['quality','stars','fresh','new','trending','downloads']) for (let page=1; page<=10; page++) for (const facet of facets) {
  const result = variant(`sort=${sort}&page=${page}&${facet}`)
  assert.ok(result)
  keys.add(result.key)
  assert.deepEqual(parseDirectoryBrowseVariant(result.key), result)
}
assert.equal(keys.size, 1560, 'Only 1,560 possible browse variants per locale, generated on demand')
assert.equal(publicCachedRoute('/zh/docs', new URLSearchParams('lang=zh&utm_source=x')), '/cached-public/zh/core/docs')
assert.equal(publicCachedRoute('/zh/docs', new URLSearchParams('lang=zh&q=search')), null)
assert.equal(publicCachedRoute('/zh/docs', new URLSearchParams('lang=fr')), null)
assert.equal(publicCachedRoute('/skills', new URLSearchParams('lang=en')), '/cached-public/en/skills')
assert.equal(publicCachedRoute('/zh/skills', new URLSearchParams('lang=zh')), '/cached-public/zh/directory/quality~1~all~all')
for (const path of ['/profile','/api/payments/library','/skills/new','/cached-public/en/directory/new~1~all~all']) {
  assert.equal(publicCachedRoute(path, new URLSearchParams('sort=new')), null)
}
console.log('Browse cache: finite exhaustive keys, locale separation, query preservation, duplicate rejection and private isolation passed.')
